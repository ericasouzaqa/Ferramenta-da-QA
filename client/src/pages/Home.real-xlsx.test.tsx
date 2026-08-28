import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pdfExtractionMock, toastMock } = vi.hoisted(() => ({
  pdfExtractionMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.unmock("@/lib/xlsx-reader");
vi.mock("@/lib/pdf-reader", () => ({
  extractPdfEvidence: pdfExtractionMock,
  pdfSourceText: (extraction: { text: string }) => extraction.text,
  detectComplexPdfLayoutPages: () => [],
  detectPdfContexts: () => [],
}));
vi.mock("sonner", () => ({ toast: toastMock }));

import Home from "./Home";

class IntersectionObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

function fileInput(container: HTMLElement, acceptFragment: string): HTMLInputElement {
  const input = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]')).find((candidate) => candidate.accept.includes(acceptFragment));
  if (!input) throw new Error(`Input de arquivo com formato ${acceptFragment} não encontrado.`);
  return input;
}

function textFile(name: string, content: string): File {
  const file = new File([content], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue(content) });
  return file;
}

describe("Home com planilha real", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    pdfExtractionMock.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
  });

  afterEach(() => cleanup());

  it("preserva a planilha fornecida junto a texto, log, PDF e imagem", async () => {
    const user = userEvent.setup();
    pdfExtractionMock.mockResolvedValue({
      text: "[Página 1]\nRequisito PDF preservado.",
      pageCount: 1,
      pages: [{ page: 1, text: "Requisito PDF preservado.", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });
    const xlsxBytes = await readFile(resolve(process.cwd(), "client/src/lib/__fixtures__/massa-e-regras-campos.xlsx"));
    const realSpreadsheet = new File([new Uint8Array(xlsxBytes)], "massa_e_regras_campos(1).xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const { container } = render(<Home />);
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Texto livre preservado.");

    await user.upload(fileInput(container, "text/plain"), textFile("integracao.log", "INFO fonte de log preservada"));
    await waitFor(() => expect(source.value).toContain("INFO fonte de log preservada"));
    await user.upload(fileInput(container, "spreadsheetml.sheet"), realSpreadsheet);
    await waitFor(() => expect(source.value).toContain("[Aba: Validacoes_de_Tela]"));
    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "requisito.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(source.value).toContain("[PDF: requisito.pdf]"));
    await user.upload(fileInput(container, "image/png"), new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" }));

    await waitFor(() => expect(source.value).toContain("Título: Imagem · erro.png"));
    expect(source.value).toContain("Texto livre preservado.");
    expect(source.value).toContain("Título: Log · integracao.log");
    expect(source.value).toContain("ID_Ref | Componente | Validacao_Alvo");
    expect(source.value).toContain("[Aba: Massa_Campanhas_XLSX]");
    expect(source.value).toContain("[Aba: Massa_Postman_E_Automacao]");
    expect(source.value).toContain("Requisito PDF preservado.");
  });
});
