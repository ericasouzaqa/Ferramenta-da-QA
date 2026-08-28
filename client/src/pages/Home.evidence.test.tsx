import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const { pdfExtractionMock, spreadsheetExtractionMock, toastMock } = vi.hoisted(() => ({
  pdfExtractionMock: vi.fn(),
  spreadsheetExtractionMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("@/lib/pdf-reader", () => ({
  extractPdfEvidence: pdfExtractionMock,
  pdfSourceText: (extraction: { text: string; pages: Array<{ page: number }> }) => extraction.text || extraction.pages.map((page) => `[Página ${page.page}]\n(Sem camada de texto pesquisável.)`).join("\n\n"),
}));
vi.mock("@/lib/xlsx-reader", () => ({ extractSpreadsheetEvidence: spreadsheetExtractionMock }));
vi.mock("sonner", () => ({ toast: toastMock }));

function fileInput(container: HTMLElement, fragment: string) {
  const input = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]')).find((item) => item.accept.includes(fragment));
  if (!input) throw new Error(`Entrada ${fragment} não encontrada.`);
  return input;
}

function textFile(name: string, content: string) {
  const file = new File([content], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue(content) });
  return file;
}

describe("fluxo documental da Ferramenta da QA", () => {
  beforeEach(() => {
    localStorage.clear();
    pdfExtractionMock.mockReset();
    spreadsheetExtractionMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:qa"), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("exibe somente as cinco etapas do fluxo principal", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /Fonte/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Entregas/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Cenários STEP/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gherkin/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Exportação/ })).toBeTruthy();
    expect(screen.queryByText(/Aplicativo|Planilha|Cards de bug|Triagem/)).toBeNull();
  });

  it("exige confirmação da leitura antes de organizar a fonte", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const source = screen.getByLabelText("Texto de origem");
    await user.type(source, "STEP 1\nTítulo: Cadastro\nItem 1");
    expect((screen.getByRole("button", { name: "Organizar entregas" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    expect(screen.getByText("Fonte do documento")).toBeTruthy();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("preserva STEP, referência, seções e Gherkin quando a fonte está completa", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), [
      "STEP 1",
      "Título: Ativar campanha",
      "Item 1",
      "Pré-condições",
      "Possuir acesso à campanha.",
      "Passos",
      "Abrir a campanha.",
      "Clicar em ativar.",
      "Resultado esperado",
      "A campanha deve ser ativada.",
    ].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    expect(await screen.findByText("Organização por entrega")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ver cenários STEP" }));
    expect(screen.getByText("Ativar campanha")).toBeTruthy();
    expect(screen.getByText("Referência: Item 1")).toBeTruthy();
    expect(screen.getByText("Clicar em ativar.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ver Gherkin" }));
    expect(screen.getByText(/Funcionalidade: Ativar campanha/)).toBeTruthy();
  });

  it("registra gaps e não cria comportamento ausente", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), "Título: Relato curto\nO botão não responde.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    await user.click(screen.getByRole("button", { name: "Ver cenários STEP" }));
    expect(screen.getAllByText("Não informado no conteúdo de origem.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/A funcionalidade deve concluir|Corrigir o comportamento descrito/)).toBeNull();
    expect(screen.getByText("Gaps e indefinições")).toBeTruthy();
  });

  it("lê PDF localmente e preserva o texto antes da confirmação", async () => {
    const user = userEvent.setup();
    pdfExtractionMock.mockResolvedValue({ text: "Requisito preservado.", pageCount: 1, hasSearchableText: true, pages: [{ page: 1, text: "Requisito preservado.", imageDataUrl: "data:image/jpeg;base64,AA==" }] });
    const { container } = render(<Home />);
    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "requisito.pdf", { type: "application/pdf" }));
    const source = await screen.findByLabelText("Texto de origem") as HTMLTextAreaElement;
    await waitFor(() => expect(source.value).toContain("Requisito preservado."));
    expect(source.value).toContain("[PDF: requisito.pdf]");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  });

  it("lê XLSX e preserva abas, cabeçalhos e linhas", async () => {
    const user = userEvent.setup();
    spreadsheetExtractionMock.mockResolvedValue({ sourceText: "[Planilha: regras.xlsx]\n[Aba: Regras]\nCabeçalhos: Campo | Regra\nLinha 2: Campo=Status | Regra=Obrigatório", sheetCount: 1, rowCount: 1, sheets: [] });
    const { container } = render(<Home />);
    await user.upload(fileInput(container, "spreadsheetml.sheet"), new File(["xlsx"], "regras.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const source = await screen.findByLabelText("Texto de origem") as HTMLTextAreaElement;
    expect(source.value).toContain("[Aba: Regras]");
    expect(source.value).toContain("Campo=Status");
  });

  it("preserva imagem e log como blocos de evidência a confirmar", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.upload(fileInput(container, "image/*"), new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" }));
    await user.upload(fileInput(container, "text/plain"), textFile("app.log", "ERROR 500"));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await waitFor(() => expect(source.value).toContain("[IMAGEM · erro.png]"));
    expect(source.value).toContain("[LOG · app.log]");
    expect(source.value).toContain("ERROR 500");
  });

  it("copia STEP e exporta CSV sem integração externa", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const NativeBlob = globalThis.Blob;
    let csvPart = "";
    vi.stubGlobal("Blob", class extends NativeBlob {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        csvPart = String(parts?.[0] ?? "");
        super(parts, options);
      }
    });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), ["STEP 1", "Título: Cadastro", "Item 1", "Pré-condições", "Possuir acesso.", "Passos", "Abrir tela.", "Resultado esperado", "Exibir tela."].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    await user.click(screen.getByRole("button", { name: "Ver cenários STEP" }));
    await user.click(screen.getByRole("button", { name: "Copiar STEP" }));
    await user.click(screen.getByRole("button", { name: "Ver Gherkin" }));
    await user.click(screen.getByRole("button", { name: "Ir para exportação" }));
    await user.click(await screen.findByRole("button", { name: /Baixar CSV/i }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("STEP 1"));
    expect(csvPart).toContain("Título");
    expect(csvPart).toContain("Cadastro");
    expect(csvPart).toContain("Item 1");
    expect(csvPart).toContain("Abrir tela.");
    expect(csvPart).toContain("Exibir tela.");
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
