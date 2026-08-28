import { describe, expect, it } from "vitest";
import { detectComplexPdfLayoutPages, detectPdfContexts, pdfSourceText, reconstructPdfPageText } from "./pdf-reader";
import { pdfReferenceFixtures } from "./pdf-reference-fixtures";

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
      { str: "PBI01 - Gestão", transform: [1, 0, 0, 1, 190, 580], width: 78, height: 10 },
      { str: "SC-4126", transform: [1, 0, 0, 1, 54, 580], width: 42, height: 10 },
      { str: "de Campanhas", transform: [1, 0, 0, 1, 270, 580], width: 65, height: 10 },
    ]);

    expect(text).toBe("SC-4126 PBI01 - Gestão de Campanhas");
  });

  it("mantém a ordem original quando a fonte não fornece coordenadas de leitura", () => {
    const text = reconstructPdfPageText([{ str: "SC-1" }, { str: "PBI01" }]);
    expect(text).toBe("SC-1 PBI01");
  });

  it("preserva uma lacuna de coluna como tabulação em tabelas da camada textual", () => {
    const text = reconstructPdfPageText([
      { str: "Campo", transform: [1, 0, 0, 1, 40, 500], width: 28, height: 10 },
      { str: "Obrigatório?", transform: [1, 0, 0, 1, 120, 500], width: 56, height: 10 },
      { str: "Descrição", transform: [1, 0, 0, 1, 260, 500], width: 44, height: 10 },
    ]);
    expect(text).toBe("Campo\tObrigatório?\tDescrição");
  });

  it("reúne células da mesma linha tabular quando seus baselines variam dentro da altura da fonte", () => {
    const text = reconstructPdfPageText([
      { str: "Nome da", transform: [1, 0, 0, 1, 46, 349], width: 52, height: 12 },
      { str: "campanha", transform: [1, 0, 0, 1, 46, 328], width: 66, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 338.5], width: 21, height: 12 },
      { str: "Texto curto", transform: [1, 0, 0, 1, 210, 338.5], width: 64, height: 12 },
      { str: "Canal", transform: [1, 0, 0, 1, 46, 280], width: 35, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 280], width: 21, height: 12 },
      { str: "WhatsApp", transform: [1, 0, 0, 1, 210, 280], width: 54, height: 12 },
      { str: "atendime", transform: [1, 0, 0, 1, 46, 239], width: 54, height: 12 },
      { str: "nto", transform: [1, 0, 0, 1, 46, 218], width: 19, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 239], width: 21, height: 12 },
      { str: "Canal", transform: [1, 0, 0, 1, 210, 239], width: 35, height: 12 },
    ]);
    expect(text).toBe("Nome da campanha\tSim\tTexto curto\nCanal\tSim\tWhatsApp\natendimento\tSim\tCanal");
  });

  it("preserva uma linha multilinha representativa de Centro de Custos sem perder as colunas", () => {
    const text = reconstructPdfPageText([
      { str: "Centro", transform: [1, 0, 0, 1, 46.88, 692.44], width: 38.316, height: 12 },
      { str: "de Custos", transform: [1, 0, 0, 1, 46.88, 671.51], width: 55.356, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113.36, 681.97], width: 20.904, height: 12 },
      { str: "Corporativo", transform: [1, 0, 0, 1, 209.63, 697.99], width: 62.016, height: 12 },
      { str: "Operação", transform: [1, 0, 0, 1, 209.63, 677.06], width: 52.692, height: 12 },
      { str: "NGP", transform: [1, 0, 0, 1, 209.63, 656.14], width: 26.004, height: 12 },
      { str: "Objetivo", transform: [1, 0, 0, 1, 46.88, 546.26], width: 47.4, height: 12 },
      { str: "Não", transform: [1, 0, 0, 1, 113.36, 546.26], width: 23.112, height: 12 },
      { str: "Texto longo", transform: [1, 0, 0, 1, 209.63, 546.26], width: 66.912, height: 12 },
    ]);
    expect(text).toContain("Centro de Custos\tSim\tCorporativo Operação NGP");
    expect(text).toContain("Objetivo\tNão\tTexto longo");
  });

  it("não funde título multilinha com descrição abaixo em uma página que também contém tabela", () => {
    const text = reconstructPdfPageText([
      { str: "Comando", transform: [1, 0, 0, 1, 42, 520], width: 70, height: 12 },
      { str: "Parâmetros", transform: [1, 0, 0, 1, 269, 520], width: 74, height: 12 },
      { str: "ID", transform: [1, 0, 0, 1, 394, 520], width: 14, height: 12 },
      { str: "[IMPEDIDO - DOC. TÉC] PBI04 - Ver os comandos enviados", transform: [1, 0, 0, 1, 42, 314.25], width: 491, height: 18 },
      { str: "para todos os equipamentos", transform: [1, 0, 0, 1, 42, 282.9], width: 242, height: 18 },
      { str: "comandos enviados dentro de um período de tempo, com filtro", transform: [1, 0, 0, 1, 72, 246.15], width: 358, height: 12 },
    ]);

    expect(text).toContain("[IMPEDIDO - DOC. TÉC] PBI04 - Ver os comandos enviados\npara todos os equipamentos\ncomandos enviados dentro de um período de tempo, com filtro");
  });
});

describe("pdfSourceText", () => {
  it("mantém uma marca de página e sinaliza a ausência de texto pesquisável sem inventar OCR", () => {
    const source = pdfSourceText({
      text: "",
      pages: [{ page: 1, text: "", imageDataUrl: "data:image/jpeg;base64,AA==" }],
    });

    expect(source).toContain("[Página 1]");
    expect(source).toContain("Sem camada de texto pesquisável");
  });
});

describe("detectComplexPdfLayoutPages", () => {
  it("sinaliza somente páginas com três ou mais colunas preservadas", () => {
    expect(detectComplexPdfLayoutPages([
      { page: 1, text: "Descrição simples" },
      { page: 2, text: "Campo\tObrigatório?\tDescrição" },
    ])).toEqual([2]);
  });
});

describe("detectPdfContexts", () => {
  it("separa somente títulos explícitos de requisito e mantém a origem por página", () => {
    const contexts = detectPdfContexts([
      { page: 1, text: "Introdução\nSC-100 PBI01 - Cadastro", imageDataUrl: "" },
      { page: 2, text: "Regra já fornecida", imageDataUrl: "" },
      { page: 3, text: "SC-101 F02 - Consulta\n[IMPEDIDO - DOC. TÉC] PBI02 - Integração", imageDataUrl: "" },
    ]);

    expect(contexts).toEqual([
      expect.objectContaining({ title: "Contexto inicial do PDF (sem título de requisito)", pages: [1], status: "a confirmar" }),
      expect.objectContaining({ title: "SC-100 PBI01 - Cadastro", pages: [1, 2], status: "fornecido" }),
      expect.objectContaining({ title: "SC-101 F02 - Consulta", pages: [3], status: "fornecido" }),
      expect.objectContaining({ title: "[IMPEDIDO - DOC. TÉC] PBI02 - Integração", pages: [3], status: "fornecido" }),
    ]);
  });

  it("anexa uma linha de continuação quando o título termina em artigo explícito", () => {
    const contexts = detectPdfContexts([{ page: 1, text: "SC-200 PBI01 - Enviar um\ncomando para equipamento", imageDataUrl: "" }]);
    expect(contexts[1]).toMatchObject({ title: "SC-200 PBI01 - Enviar um comando para equipamento", pages: [1] });
  });

  it("não anexa uma descrição depois de uma palavra que apenas termina com a letra de um artigo", () => {
    const contexts = detectPdfContexts([{ page: 1, text: "SC-300 Task - Remover botões de Nova ação\nCom a mudança, remover o botão", imageDataUrl: "" }]);
    expect(contexts[1]).toMatchObject({ title: "SC-300 Task - Remover botões de Nova ação", pages: [1] });
  });

  it("anexa uma continuação em minúsculas que está na linha seguinte do título", () => {
    const contexts = detectPdfContexts([{ page: 1, text: "[IMPEDIDO - DOC. TÉC] PBI04 - Configurar\ntimeout + envio de parâmetros", imageDataUrl: "" }]);
    expect(contexts[1]).toMatchObject({ title: "[IMPEDIDO - DOC. TÉC] PBI04 - Configurar timeout + envio de parâmetros", pages: [1] });
  });

  it("mantém títulos representativos das quatro entregas validadas", () => {
    const contexts = detectPdfContexts([
      { page: 1, text: "SC-2761 F02: Ver Planos cadastrados + Editar", imageDataUrl: "" },
      { page: 2, text: "SC-4272 [Web] PBI01 - Visualização da Última Posição", imageDataUrl: "" },
      { page: 3, text: "[IMPEDIDO - DOC. TÉC] PBI04 - Configurar\ntimeout + envio de parâmetros", imageDataUrl: "" },
      { page: 4, text: "SC-4310 PBI03 - Motor de Execução e Fila de Processamento", imageDataUrl: "" },
    ]);
    expect(contexts.map((context) => context.title)).toEqual([
      "Contexto inicial do PDF (sem título de requisito)",
      "SC-2761 F02: Ver Planos cadastrados + Editar",
      "SC-4272 [Web] PBI01 - Visualização da Última Posição",
      "[IMPEDIDO - DOC. TÉC] PBI04 - Configurar timeout + envio de parâmetros",
      "SC-4310 PBI03 - Motor de Execução e Fila de Processamento",
    ]);
  });

  it("reordena apenas o complemento curto que precede um SC emitido fora de ordem", () => {
    const contexts = detectPdfContexts([{ page: 1, text: "⭐ Última Posição\tSC-4272 [Web] PBI01 - Visualização da", imageDataUrl: "" }]);
    expect(contexts[1]).toMatchObject({ title: "SC-4272 [Web] PBI01 - Visualização da Última Posição", pages: [1] });
  });

  it("não inclui uma lista ou coluna ao lado do título explícito do requisito", () => {
    const contexts = detectPdfContexts([{ page: 1, text: "SC-4304 (PBI02) Documento 4: Validação de Planilhas - →\t[Restrição de Input] O upload deve aceitar XLSX", imageDataUrl: "" }]);
    expect(contexts[1]).toMatchObject({ title: "SC-4304 (PBI02) Documento 4: Validação de Planilhas", pages: [1] });
  });

  it("mantém títulos e linhas tabulares representativos das quatro referências PDF", () => {
    for (const fixture of pdfReferenceFixtures) {
      const contexts = detectPdfContexts([{ page: fixture.page, text: fixture.contextText, imageDataUrl: "" }]);
      expect(contexts.some((context) => context.title === fixture.expectedTitle), fixture.file).toBe(true);
      expect(reconstructPdfPageText(fixture.tableItems), fixture.file).toContain(fixture.expectedTableLine);
    }
  });
});
