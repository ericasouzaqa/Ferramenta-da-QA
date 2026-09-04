import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const { spreadsheetExtractionMock, toastMock } = vi.hoisted(() => ({
  spreadsheetExtractionMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
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

  it("exibe as seis etapas do fluxo principal", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /Texto Bruto/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Organizar História/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gerar STEPs/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Performance/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Gaps/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Exportar/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Gherkin/ })).toBeNull();
    expect(screen.queryByText(/Aplicativo|Planilha|Cards de bug|Triagem/)).toBeNull();
  });

  it("exige confirmação da leitura antes de organizar a fonte", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const source = screen.getByLabelText("Texto de origem");
    await user.type(source, "STEP 1\nTítulo: Cadastro\nItem 1");
    expect((screen.getByRole("button", { name: "Organizar entregas" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    expect(screen.getByText("Texto bruto")).toBeTruthy();
    expect(toastMock.error).not.toHaveBeenCalled();
  });

  it("preserva STEP, referência, seções e auditoria quando a fonte está completa", async () => {
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
    expect(await screen.findByRole("heading", { name: "Organizar História" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    expect(screen.getByText("Ativar campanha")).toBeTruthy();
    expect(screen.getByText("Referência: Item 1")).toBeTruthy();
    expect(screen.getByText("Clicar em ativar.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copiar todos os STEPs" })).toBeTruthy();
    expect(screen.getByLabelText("Auditoria da qualidade")).toBeTruthy();
  });

  it("registra gaps e não cria comportamento ausente", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), "Título: Relato curto\nO botão não responde.");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    expect(screen.getAllByText("Não informado no conteúdo de origem.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/A funcionalidade deve concluir|Corrigir o comportamento descrito/)).toBeNull();
    expect(screen.getByText("Gaps e indefinições")).toBeTruthy();
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

  it("copia um STEP e todos os STEPs diretamente na etapa de cenários", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), ["STEP 1", "Título: Cadastro", "Item 1", "Pré-condições", "Possuir acesso.", "Passos", "Abrir tela.", "Resultado esperado", "Exibir tela."].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    await user.click(screen.getByRole("button", { name: "Copiar STEP" }));
    await user.click(screen.getByRole("button", { name: "Copiar todos os STEPs" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("STEP 1"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Cadastro"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Abrir tela."));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Exibir tela."));
  });

  it("executa o fluxo crítico completo e exporta sem acessar serviços externos", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), [
      "STEP 1",
      "Título: Pesquisar clientes",
      "Item 1",
      "Passos",
      "Pesquisar clientes no filtro.",
      "Resultado esperado",
      "Exibir a lista de clientes.",
    ].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar entregas" }));
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    await user.click(screen.getByRole("button", { name: "Analisar Performance" }));
    expect(screen.getByRole("heading", { name: "Análise Preventiva de Performance" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Ver Gaps e Indefinições" }));
    expect(screen.getByRole("heading", { name: "Gaps e Indefinições" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Exportar Resultado" }));
    expect(screen.getByRole("heading", { name: "Exportar Resultado" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /TXT/ }));
    await user.click(screen.getByRole("button", { name: /Markdown/ }));
    await user.click(screen.getByRole("button", { name: /Excel/ }));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(3);
  });
});
