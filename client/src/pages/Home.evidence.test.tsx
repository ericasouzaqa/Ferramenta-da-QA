import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const { complexPdfLayoutMock, detectPdfContextsMock, pdfExtractionMock, spreadsheetExtractionMock, toastMock } = vi.hoisted(() => ({
  complexPdfLayoutMock: vi.fn(),
  detectPdfContextsMock: vi.fn(),
  pdfExtractionMock: vi.fn(),
  spreadsheetExtractionMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("@/lib/pdf-reader", () => ({
  extractPdfEvidence: pdfExtractionMock,
  pdfSourceText: (extraction: { text: string; pages: Array<{ page: number }> }) => extraction.text || extraction.pages.map((page) => `[Página ${page.page}]\n(Sem camada de texto pesquisável. A evidência visual deve ser confirmada em sessão autenticada.)`).join("\n\n"),
  detectComplexPdfLayoutPages: complexPdfLayoutMock,
  detectPdfContexts: detectPdfContextsMock,
}));
vi.mock("@/lib/xlsx-reader", () => ({ extractSpreadsheetEvidence: spreadsheetExtractionMock }));
vi.mock("sonner", () => ({ toast: toastMock }));

class IntersectionObserverMock {
  observe() {}
  disconnect() {}
  unobserve() {}
}

function fileInput(container: HTMLElement, acceptFragment: string): HTMLInputElement {
  const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
  const input = Array.from(inputs).find((candidate) => candidate.accept.includes(acceptFragment));
  if (!input) throw new Error(`Input de arquivo com formato ${acceptFragment} não encontrado.`);
  return input;
}

function textFile(name: string, content: string): File {
  const file = new File([content], name, { type: "text/plain" });
  Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue(content) });
  return file;
}

describe("Home evidence import", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:sinal-qa"), revokeObjectURL: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    pdfExtractionMock.mockReset();
    spreadsheetExtractionMock.mockReset();
    complexPdfLayoutMock.mockReset();
    complexPdfLayoutMock.mockReturnValue([]);
    detectPdfContextsMock.mockReset();
    detectPdfContextsMock.mockReturnValue([]);
    toastMock.success.mockReset();
    toastMock.error.mockReset();
    toastMock.info.mockReset();
  });

  afterEach(() => cleanup());

  it("importa um log, preserva o conteúdo e cria um contexto rastreável", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const log = textFile("backend.log", "ERROR 500\nrequestId=abc");

    await user.upload(fileInput(container, "text/plain"), log);

    await waitFor(() => expect(screen.getByText("1 evidência importada")).toBeTruthy());
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await waitFor(() => expect(source.value).toContain("Título: Log · backend.log"));
    expect(source.value).toContain("ERROR 500");
    expect(source.value).toContain("Origem: Log");
    expect(screen.getByText("1 contexto rastreável por origem")).toBeTruthy();
  });

  it("importa uma planilha preservando abas, cabeçalhos e linhas como contexto rastreável", async () => {
    const user = userEvent.setup();
    spreadsheetExtractionMock.mockResolvedValue({
      sourceText: "[Planilha: massa.xlsx]\n[Aba: Validacoes]\nCabeçalhos: ID_Ref | Campo\nLinha 2: ID_Ref=SC-1 | Campo=Placa",
      sheetCount: 1,
      rowCount: 1,
      sheets: [{ name: "Validacoes", headers: ["ID_Ref", "Campo"], rows: [["SC-1", "Placa"]] }],
    });
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));

    await user.upload(fileInput(container, "spreadsheetml.sheet"), new File(["planilha"], "massa.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    await waitFor(() => expect(screen.getAllByText("Planilha · massa.xlsx").length).toBeGreaterThan(0));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    expect(source.value).toContain("[Aba: Validacoes]");
    expect(source.value).toContain("Linha 2: ID_Ref=SC-1 | Campo=Placa");
    expect(screen.getByText("1 aba e 1 linha preservada")).toBeTruthy();
  });

  it("acrescenta texto, log, XLSX, PDF e imagem sem substituir fontes anteriores", async () => {
    const user = userEvent.setup();
    spreadsheetExtractionMock.mockResolvedValue({
      sourceText: "[Planilha: massa.xlsx]\n[Aba: Regras]\nCabeçalhos: Campo | Regra\nLinha 2: Campo=Placa | Regra=Obrigatório",
      sheetCount: 1,
      rowCount: 1,
      sheets: [{ name: "Regras", headers: ["Campo", "Regra"], rows: [["Placa", "Obrigatório"]] }],
    });
    pdfExtractionMock.mockResolvedValue({
      text: "[Página 1]\nRequisito de PDF preservado.",
      pageCount: 1,
      pages: [{ page: 1, text: "Requisito de PDF preservado.", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Texto colado preservado.");

    await user.upload(fileInput(container, "text/plain"), textFile("execucao.log", "INFO execução iniciada"));
    await waitFor(() => expect(source.value).toContain("INFO execução iniciada"));
    await user.upload(fileInput(container, "spreadsheetml.sheet"), new File(["planilha"], "massa.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    await waitFor(() => expect(source.value).toContain("[Aba: Regras]"));
    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "requisito.pdf", { type: "application/pdf" }));
    await waitFor(() => expect(source.value).toContain("[PDF: requisito.pdf]"));
    await user.upload(fileInput(container, "image/png"), new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" }));

    await waitFor(() => expect(source.value).toContain("Título: Imagem · erro.png"));
    expect(source.value).toContain("Texto colado preservado.");
    expect(source.value).toContain("Título: Log · execucao.log");
    expect(source.value).toContain("[Planilha: massa.xlsx]");
    expect(source.value).toContain("Requisito de PDF preservado.");
  });

  it("preserva a fonte e informa erro quando a leitura XLSX falha", async () => {
    const user = userEvent.setup();
    spreadsheetExtractionMock.mockRejectedValue(new Error("arquivo inválido"));
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");

    await user.upload(fileInput(container, "spreadsheetml.sheet"), new File(["planilha inválida"], "falha.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Não foi possível ler uma das planilhas. O texto atual foi preservado."));
    expect(source.value).toContain("Contexto existente");
    expect(source.value).not.toContain("[Planilha: falha.xlsx]");
  });

  it("mantém uma imagem como evidência local a confirmar sem exigir autenticação", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const image = new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" });

    await user.upload(fileInput(container, "image/png"), image);

    await waitFor(() => expect(screen.getAllByText("Imagem · erro.png").length).toBeGreaterThan(0));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    expect(source.value).toContain("Título: Imagem · erro.png");
    expect(source.value).toContain("A confirmar: Imagem anexada sem descrição textual");
  });

  it("rejeita imagem acima do limite seguro sem alterar a fonte", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");
    const oversized = new File([new Uint8Array(3 * 1024 * 1024 + 1)], "grande.png", { type: "image/png" });

    await user.upload(fileInput(container, "image/png"), oversized);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Não foi possível analisar uma das imagens. O texto atual foi preservado."));
    expect(source.value).toContain("Contexto existente");
    expect(source.value).not.toContain("Título: Imagem · grande.png");
  });

  it("preserva a fonte e informa erro quando a leitura de log falha", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");
    const failure = new File(["incompleto"], "falha.log", { type: "text/plain" });
    Object.defineProperty(failure, "text", { value: vi.fn().mockRejectedValue(new Error("leitura indisponível")) });

    await user.upload(fileInput(container, "text/plain"), failure);

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Não foi possível ler um dos logs. O texto atual foi preservado."));
    expect(source.value).toContain("Contexto existente");
    expect(source.value).not.toContain("[LOG · falha.log]");
  });

  it("gera material a partir de texto, log e imagem combinados", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Comportamento atual: salvar pedido falha. Comportamento esperado: pedido salvo.");
    await user.upload(fileInput(container, "text/plain"), textFile("api.log", "ERROR 500 ao salvar pedido"));
    await user.upload(fileInput(container, "image/png"), new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" }));
    await user.click(screen.getByRole("button", { name: "Confirmar leitura integral" }));
    await user.click(screen.getByRole("button", { name: "Organizar para QA" }));

    await waitFor(() => expect(screen.getAllByText("Descrição").length).toBeGreaterThan(0));
    expect(source.value).toContain("Título: Log · api.log");
    expect(source.value).toContain("Título: Imagem · erro.png");
  });

  it("gera um card completo a partir de um problema curto digitado no campo de bug", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem");
    await user.type(source, [
      "O botão Salvar não responde depois do preenchimento.",
      "A tela permanece aberta e o cadastro não é concluído.",
      "A pessoa usuária não consegue finalizar a solicitação.",
    ].join("\n"));

    await user.click(screen.getByRole("button", { name: "Confirmar leitura integral" }));
    await user.click(screen.getByRole("button", { name: "Organizar para QA" }));

    await waitFor(() => expect(screen.getAllByText("Descrição").length).toBeGreaterThan(0));
    expect(screen.getAllByText("Itens de correção").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Critérios de aceite").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cenários de teste").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Corrigir o comportamento descrito para eliminar a falha relatada.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("A funcionalidade deve concluir a ação informada sem apresentar a falha descrita.").length).toBeGreaterThan(0);
    expect(screen.getByText("STEP 1")).toBeTruthy();
    expect(screen.getByText("Gaps e indefinições")).toBeTruthy();
  });

  it("lê integralmente o texto de um PDF localmente sem chamar inteligência artificial", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto previamente colado.");
    pdfExtractionMock.mockResolvedValue({
      text: "Página 1\nRequisito preservado.",
      pageCount: 1,
      pages: [{ page: 1, text: "Requisito preservado.", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });
    detectPdfContextsMock.mockReturnValue([{ title: "SC-100 PBI01 - Cadastro", pages: [1], sourceExcerpts: ["SC-100 PBI01 - Cadastro"], visualEvidence: [], status: "fornecido" }]);
    complexPdfLayoutMock.mockReturnValue([1]);

    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "requisito.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(screen.getByText(/requisito.pdf · 1 página lida integralmente/)).toBeTruthy());
    expect(source.value).toContain("Contexto previamente colado.");
    expect(source.value).toContain("[PDF: requisito.pdf]");
    expect(source.value).toContain("Requisito preservado.");
    expect(screen.getByText("PDF · requisito.pdf")).toBeTruthy();
    expect(screen.getAllByText("SC-100 PBI01 - Cadastro").length).toBeGreaterThan(0);
    expect(screen.getByText(/tabela ou layout com múltiplas colunas/)).toBeTruthy();
    expect(toastMock.success).toHaveBeenCalledWith("PDF lido localmente e preservado integralmente. A organização está aguardando sua confirmação.");
  });

  it("preserva a fonte e comunica a falha de leitura de PDF", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    pdfExtractionMock.mockRejectedValue(new Error("arquivo inválido"));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");

    await user.upload(fileInput(container, "application/pdf"), new File(["pdf inválido"], "falha.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Não foi possível concluir a análise do PDF. O conteúdo existente foi preservado."));
    expect(source.value).toContain("Contexto existente");
    expect(screen.getByText("Não foi possível ler o PDF. Nenhum texto foi criado ou alterado.")).toBeTruthy();
  });

  it("registra o PDF completo e aguarda a confirmação da leitura", async () => {
    const user = userEvent.setup();
    pdfExtractionMock.mockResolvedValue({
      text: "[Página 1]\nConteúdo preservado.",
      pageCount: 1,
      pages: [{ page: 1, text: "Conteúdo preservado.", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");

    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "visual-falha.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(screen.getByText(/visual-falha.pdf · 1 página lida integralmente/)).toBeTruthy());
    expect(source.value).toContain("Contexto existente");
    expect(source.value).toContain("[PDF: visual-falha.pdf]");
    expect(screen.getByText("PDF · visual-falha.pdf")).toBeTruthy();
  });

  it("preserva um PDF autenticado e aguarda confirmação antes de organizar os contextos", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    pdfExtractionMock.mockResolvedValue({
      text: "[Página 1]\nSalvar pedido.",
      pageCount: 1,
      pages: [{ page: 1, text: "Salvar pedido.", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });

    await user.upload(fileInput(container, "application/pdf"), new File(["pdf"], "entrega.pdf", { type: "application/pdf" }));

    await waitFor(() => expect(screen.getByText(/entrega.pdf · 1 página lida integralmente/)).toBeTruthy());
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    expect(source.value).toContain("[Página 1]");
    expect(source.value).toContain("Salvar pedido.");
    expect(source.value).not.toContain("Título: Entrega de pedidos");
    expect(source.value).not.toContain("Evidência visual observada: Botão Salvar visível.");
    expect(screen.queryByText("Descrição")).toBeNull();
  });

  it("limpa a fonte e todos os contextos de evidência locais", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    await user.upload(fileInput(container, "image/png"), new File([new Uint8Array([137, 80, 78, 71])], "erro.png", { type: "image/png" }));
    await waitFor(() => expect(screen.getAllByText("Imagem · erro.png").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("button", { name: /limpar/i }));

    expect((screen.getByLabelText("Texto de origem") as HTMLTextAreaElement).value).toBe("");
    expect(screen.queryByText("1 evidência importada")).toBeNull();
    expect(screen.queryByText("1 contexto rastreável por origem")).toBeNull();
  });

  it("preserva a fonte e registra imagem local para confirmação", async () => {
    const user = userEvent.setup();
    const { container } = render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Contexto existente");

    await user.upload(fileInput(container, "image/png"), new File(["imagem"], "falha.png", { type: "image/png" }));

    await waitFor(() => expect(screen.getAllByText("Imagem · falha.png").length).toBeGreaterThan(0));
    expect(source.value).toContain("Contexto existente");
    expect(source.value).toContain("Título: Imagem · falha.png");
  });

  it("salva o contexto do projeto e permite adicionar, editar e remover uma linha da planilha", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    await user.click(screen.getByRole("tab", { name: /Planilha/ }));

    await user.click(screen.getByRole("button", { name: "Ferramenta da QA" }));
    await user.clear(screen.getByLabelText("Nome do projeto"));
    await user.type(screen.getByLabelText("Nome do projeto"), "QA de pagamentos");
    await user.click(screen.getByRole("button", { name: /salvar dados/i }));
    expect(screen.getByRole("button", { name: "QA de pagamentos" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "QA de pagamentos" }));
    await user.clear(screen.getByLabelText("Nome do projeto"));
    await user.type(screen.getByLabelText("Nome do projeto"), "Rascunho não salvo");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.getByRole("button", { name: "QA de pagamentos" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Novo caso" }));
    const scenarioName = screen.getByLabelText("Nome do cenário QA-001") as HTMLInputElement;
    await user.clear(scenarioName);
    await user.type(scenarioName, "Validar pagamento aprovado");
    await user.selectOptions(screen.getByLabelText("Tipo QA-001"), "Integração");
    await user.selectOptions(screen.getByLabelText("Canal QA-001"), "SMS");
    await user.selectOptions(screen.getByLabelText("Prioridade QA-001"), "P1");
    await user.selectOptions(screen.getByLabelText("Situação QA-001"), "Pronto");
    await user.clear(screen.getByLabelText("Latência QA-001"));
    await user.type(screen.getByLabelText("Latência QA-001"), "1.5");
    await user.clear(screen.getByLabelText("Custo QA-001"));
    await user.type(screen.getByLabelText("Custo QA-001"), "0.125");
    await user.clear(screen.getByLabelText("Responsável QA-001"));
    await user.type(screen.getByLabelText("Responsável QA-001"), "Erica");
    expect(scenarioName.value).toBe("Validar pagamento aprovado");
    expect((screen.getByLabelText("Tipo QA-001") as HTMLSelectElement).value).toBe("Integração");
    expect((screen.getByLabelText("Canal QA-001") as HTMLSelectElement).value).toBe("SMS");
    expect((screen.getByLabelText("Prioridade QA-001") as HTMLSelectElement).value).toBe("P1");
    expect((screen.getByLabelText("Situação QA-001") as HTMLSelectElement).value).toBe("Pronto");
    expect((screen.getByLabelText("Latência QA-001") as HTMLInputElement).value).toBe("1.5");
    expect((screen.getByLabelText("Custo QA-001") as HTMLInputElement).value).toBe("0.125");
    expect((screen.getByLabelText("Responsável QA-001") as HTMLInputElement).value).toBe("Erica");

    await user.click(screen.getByRole("button", { name: "Excluir QA-001" }));
    expect(screen.queryByLabelText("Nome do cenário QA-001")).toBeNull();
  });

  it("filtra a planilha por situação e preserva a linha ao retornar para todos os casos", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    await user.click(screen.getByRole("tab", { name: /Planilha/ }));
    await user.click(screen.getByRole("button", { name: "Novo caso" }));
    expect(screen.getByLabelText("Nome do cenário QA-001")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Atenção" }));
    expect(screen.getByLabelText("Nome do cenário QA-001")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Pronto" }));
    expect(screen.getByText(/Nenhum caso neste filtro/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Bloqueado" }));
    expect(screen.getByText(/Nenhum caso neste filtro/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(screen.getByLabelText("Nome do cenário QA-001")).toBeTruthy();
  });

  it("organiza uma fonte pelo comando principal e mostra a orientação móvel apenas quando há evidência de aplicativo", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem");
    await user.type(source, "Aplicativo Android: comportamento atual: salvar pedido falha. Comportamento esperado: pedido salvo.");

    expect(screen.getByText("Configuração e testes de aplicativo")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Escopo da geração"), "cenarios");
    await user.click(screen.getByRole("button", { name: "Confirmar leitura integral" }));
    await user.click(screen.getByRole("button", { name: "Organizar para QA" }));
    await user.click(screen.getByRole("tab", { name: /Aplicativo/ }));
    expect(screen.getByText("Testes de aplicativo")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Appium" }));
    expect(screen.getByRole("button", { name: "Appium" }).className).toContain("bg-[#0c5b73]");
  });

  it("copia cards e cenários e adiciona um cenário organizado à planilha", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    await user.type(screen.getByLabelText("Texto de origem"), "Comportamento atual: salvar pedido falha. Comportamento esperado: pedido salvo.");
    await user.click(screen.getByRole("button", { name: "Confirmar leitura integral" }));
    await user.click(screen.getByRole("button", { name: "Organizar para QA" }));
    await waitFor(() => expect(screen.getAllByText("Descrição").length).toBeGreaterThan(0));

    await user.click(screen.getByRole("tab", { name: /Cards de bug/ }));
    await user.click(screen.getAllByRole("button", { name: "Copiar card" })[0]!);
    await user.click(screen.getByRole("tab", { name: /Testes/ }));
    await user.click(screen.getByRole("button", { name: "Copiar testes" }));
    await user.click(screen.getByRole("button", { name: "Copiar para YouTrack" }));
    await user.click(screen.getByRole("tab", { name: /Gherkin/ }));
    expect(screen.getByRole("heading", { name: "Gherkin" })).toBeTruthy();
    expect(writeText).toHaveBeenCalledTimes(3);
    expect(toastMock.success).toHaveBeenCalledWith("Card de bug copiado.");
    expect(toastMock.success).toHaveBeenCalledWith("Cenários de teste copiado.");

    await user.click(screen.getByRole("tab", { name: /Testes/ }));
    const addScenario = screen.getAllByRole("button", { name: /Adicionar .* à planilha/ })[0];
    await user.click(addScenario!);
    await user.click(screen.getByRole("tab", { name: /Planilha/ }));
    expect(screen.getByLabelText("Nome do cenário QA-001")).toBeTruthy();
  });

  it("exporta a planilha e permite abrir e fechar a navegação móvel", async () => {
    const user = userEvent.setup();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));

    await user.click(screen.getByRole("button", { name: /exportar csv/i }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith("Planilha exportada em CSV.");

    await user.click(screen.getByRole("button", { name: "Abrir navegação" }));
    expect(screen.getByRole("button", { name: "Fechar navegação" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Fechar navegação" }));
  });
});


afterEach(() => cleanup());

  it("navega entre as abas sem bloquear etapas ou apagar a fonte", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    const source = screen.getByLabelText("Texto de origem") as HTMLTextAreaElement;
    await user.type(source, "Fonte preservada para navegar entre etapas.");

    await user.click(screen.getByRole("tab", { name: /Testes/ }));
    expect(screen.getByRole("tab", { name: /Testes/ }).getAttribute("aria-selected")).toBe("true");
    expect(document.getElementById("cenarios")?.hasAttribute("hidden")).toBe(false);
    expect(document.getElementById("fonte")?.hasAttribute("hidden")).toBe(true);

    await user.click(screen.getByRole("tab", { name: /Cards de bug/ }));
    expect(document.getElementById("bugs")?.hasAttribute("hidden")).toBe(false);
    await user.click(screen.getByRole("tab", { name: /Fonte/ }));
    expect(source.value).toContain("Fonte preservada para navegar entre etapas.");
    expect(document.getElementById("fonte")?.hasAttribute("hidden")).toBe(false);
  });


it("exibe a finalidade da ferramenta e o nome oficial no início", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /Cenários claros\. Bugs prontos\./i })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Ferramenta da QA" })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Começar pela fonte/ })).toBeTruthy();
  expect(screen.getByText(/Gere cenários organizados e use-os como base para Gherkin, sempre conferindo a fonte/)).toBeTruthy();
});
