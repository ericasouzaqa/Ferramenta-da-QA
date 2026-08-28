import { describe, expect, it, vi } from "vitest";
import { extractPdfEvidence, pdfSourceText, reconstructPdfPageText } from "./pdf-reader";

const { getDocumentMock, recognizePdfPageMock } = vi.hoisted(() => ({ getDocumentMock: vi.fn(), recognizePdfPageMock: vi.fn() }));

vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ GlobalWorkerOptions: {}, getDocument: getDocumentMock }));
vi.mock("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url", () => ({ default: "worker.js" }));
vi.mock("./ocr-reader", () => ({ recognizePdfPage: recognizePdfPageMock }));

describe("reconstructPdfPageText", () => {
  it("preserva quebras entre linhas sem reordenar os fragmentos entregues pelo PDF", () => {
    const text = reconstructPdfPageText([
      { str: "Código", transform: [1, 0, 0, 1, 48, 720], width: 32, height: 10 },
      { str: "Descrição", transform: [1, 0, 0, 1, 120, 720], width: 48, height: 10 },
      { str: "AB-01", transform: [1, 0, 0, 1, 48, 700], width: 28, height: 10 },
      { str: "Salvar pedido", transform: [1, 0, 0, 1, 120, 700], width: 58, height: 10 },
    ]);
    expect(text).toBe("Código Descrição\nAB-01 Salvar pedido");
  });

  it("não insere espaço no meio de uma palavra fragmentada sem lacuna visual", () => {
    const text = reconstructPdfPageText([
      { str: "sal", transform: [1, 0, 0, 1, 30, 500], width: 12, height: 10 },
      { str: "var", transform: [1, 0, 0, 1, 42, 500], width: 12, height: 10 },
    ]);
    expect(text).toBe("salvar");
  });

  it("reordena fragmentos emitidos fora de ordem pela posição visual da linha", () => {
    const text = reconstructPdfPageText([
      { str: "PBI01 Gestão", transform: [1, 0, 0, 1, 190, 580], width: 78, height: 10 },
      { str: "SC-4126", transform: [1, 0, 0, 1, 54, 580], width: 42, height: 10 },
      { str: "de Campanhas", transform: [1, 0, 0, 1, 270, 580], width: 65, height: 10 },
    ]);
    expect(text).toBe("SC-4126 PBI01 Gestão de Campanhas");
  });

  it("mantém a ordem original quando a fonte não fornece coordenadas de leitura", () => {
    expect(reconstructPdfPageText([{ str: "SC-1" }, { str: "PBI01" }])).toBe("SC-1 PBI01");
  });

  it("preserva lacunas de coluna como tabulação em tabelas da camada textual", () => {
    const text = reconstructPdfPageText([
      { str: "Campo", transform: [1, 0, 0, 1, 40, 500], width: 28, height: 10 },
      { str: "Obrigatório?", transform: [1, 0, 0, 1, 120, 500], width: 56, height: 10 },
      { str: "Descrição", transform: [1, 0, 0, 1, 260, 500], width: 44, height: 10 },
    ]);
    expect(text).toBe("Campo\tObrigatório?\tDescrição");
  });

  it("reúne células da mesma linha tabular quando os baselines variam", () => {
    const text = reconstructPdfPageText([
      { str: "Nome da", transform: [1, 0, 0, 1, 46, 349], width: 52, height: 12 },
      { str: "campanha", transform: [1, 0, 0, 1, 46, 328], width: 66, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 338.5], width: 21, height: 12 },
      { str: "Texto curto", transform: [1, 0, 0, 1, 210, 338.5], width: 64, height: 12 },
      { str: "Canal", transform: [1, 0, 0, 1, 46, 280], width: 35, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 280], width: 21, height: 12 },
      { str: "WhatsApp", transform: [1, 0, 0, 1, 210, 280], width: 54, height: 12 },
    ]);
    expect(text).toContain("Nome da campanha\tSim\tTexto curto");
    expect(text).toContain("Canal\tSim\tWhatsApp");
  });
});

describe("extractPdfEvidence", () => {
  it("classifica página sem texto como OCR local e impede leitura como concluída", async () => {
    recognizePdfPageMock.mockResolvedValueOnce({ text: "Texto reconhecido", confidence: 91, warning: "Conteúdo obtido por OCR local. Conferir a transcrição na imagem original." });
    const fakeCanvas = { getContext: () => ({}), toDataURL: () => "data:image/jpeg;base64,AA==" } as unknown as HTMLCanvasElement;
    vi.stubGlobal("document", { createElement: () => fakeCanvas });
    getDocumentMock.mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [] }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.resolve() }),
        }),
        cleanup: () => undefined,
      }),
    });

    const result = await extractPdfEvidence(new File(["pdf"], "escaneado.pdf", { type: "application/pdf" }));
    expect(result.text).toContain("[Página 1 · OCR local]");
    expect(result.textPages).toEqual([]);
    expect(result.ocrPages).toEqual([1]);
    expect(result.emptyPages).toEqual([]);
    expect(result.readStatus).toBe("parcial");
    expect(result.pages[0].imageDataUrl).toContain("data:image");
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("preserva texto quando a prévia visual falha", async () => {
    getDocumentMock.mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: async () => ({
          getTextContent: async () => ({ items: [{ str: "Texto preservado", transform: [1, 0, 0, 1, 40, 500], width: 80, height: 10 }] }),
          getViewport: () => ({ width: 100, height: 100 }),
          render: () => ({ promise: Promise.reject(new Error("falha de canvas")) }),
        }),
        destroy: async () => undefined,
      }),
    });

    const result = await extractPdfEvidence(new File(["pdf"], "result (5).pdf", { type: "application/pdf" }));
    expect(result.text).toContain("Texto preservado");
    expect(result.hasSearchableText).toBe(true);
    expect(result.previewFailures).toBe(1);
    expect(result.pages[0].imageDataUrl).toBe("");
  });
});

describe("pdfSourceText", () => {
  it("mantém uma marca de página e sinaliza a ausência de texto pesquisável sem inventar OCR", () => {
    const source = pdfSourceText({ text: "", pages: [{ page: 1, text: "", imageDataUrl: "data:image/jpeg;base64,AA==" }] });
    expect(source).toContain("[Página 1]");
    expect(source).toContain("Sem camada de texto pesquisável");
    expect(source).toContain("confirmada manualmente");
  });
});
