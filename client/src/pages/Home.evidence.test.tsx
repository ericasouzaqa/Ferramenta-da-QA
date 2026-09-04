import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./Home";

const { toastMock } = vi.hoisted(() => ({
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

describe("fluxo documental da Ferramenta da QA", () => {
  beforeEach(() => {
    localStorage.clear();
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
    expect(screen.getAllByRole("button", { name: /Organizar História/ }).length).toBeGreaterThan(0);
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
    expect((screen.getByRole("button", { name: "Organizar História" }) as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
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
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
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
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    expect(screen.getAllByText("Não informado no conteúdo de origem.").length).toBeGreaterThan(0);
    expect(screen.queryByText(/A funcionalidade deve concluir|Corrigir o comportamento descrito/)).toBeNull();
    expect(screen.getByText("Gaps e indefinições")).toBeTruthy();
  });

  it("copia um STEP e todos os STEPs diretamente na etapa de cenários", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), ["STEP 1", "Título: Cadastro", "Item 1", "Pré-condições", "Possuir acesso.", "Passos", "Abrir tela.", "Resultado esperado", "Exibir tela."].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    await user.click(screen.getByRole("button", { name: "Copiar STEP" }));
    await user.click(screen.getByRole("button", { name: "Copiar todos os STEPs" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("STEP 1"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Cadastro"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Abrir tela."));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Exibir tela."));
  });

  it("organiza a narrativa SC-3786 como História de Usuário sem título ausente", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.type(screen.getByLabelText("Texto de origem"), [
      "⭐SC-3786 PBI01 - Enviar um comando para um equipamento",
      "Descrição",
      "Inserir o botão \"Comandos\" dentro da seção \"Dispositivos\";",
      "O botão abre a janela lateral \"Comandos\";",
      "Ao determinar um dispositivo, tipo de comando e timeout, o botão Enviar fica habilitado;",
      "Dispositivo: dropdown de seleção única com seriais vinculados ao objeto rastreável.",
      "Tipo de comando: dropdown de seleção única com comandos disponíveis para o dispositivo.",
      "HABILITAR MODO EMERGENCIA - 108",
      "RESETAR MÓDULO - ?",
      "Ponto de atenção: novos comandos precisam ser incluídos facilmente.",
      "Envia para o worker o comando;",
      "Salva no banco o comando, além do usuário que o enviou e data/hora;",
      "Mostra uma snackbar de sucesso no envio.",
      "Obs: não será possível o envio para iscas ou comandos de sms nessa entrega, o entregável é testável para ocorrências da base, com objeto rastreável ativo e acatando comandos simples enviados via Mogno.",
      "Obs: na ausência de documentação técnica referente a configuração de timeout e envio de parâmetro, esse pedaço será executado apenas no PBI04",
      "Critérios de aceite",
      "É possível enviar cada um dos comandos listados",
    ].join("\n"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
    expect(screen.getAllByText("SC-3786 PBI01 - Enviar um comando para um equipamento").length).toBeGreaterThan(0);
    expect(screen.getByText("enviar um comando para um equipamento")).toBeTruthy();
    expect(screen.getByText("usuário")).toBeTruthy();
    expect(screen.queryByText("Título não informado")).toBeNull();
    expect(screen.queryByText("História de usuário não informada nos artefatos.")).toBeNull();
    expect(screen.queryByText("About")).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    await user.click(screen.getByRole("button", { name: "Gerar STEPs" }));
    expect(screen.getByText("Possuir uma ocorrência da base.")).toBeTruthy();
    expect(screen.getByText("HABILITAR MODO EMERGENCIA - 108")).toBeTruthy();
    expect(screen.getAllByText(/Indefinição identificada: RESETAR MÓDULO/).length).toBeGreaterThan(0);
    expect(screen.queryByText("Informar um valor de timeout.")).toBeNull();
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
    await user.click(screen.getByRole("button", { name: "Organizar História" }));
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
