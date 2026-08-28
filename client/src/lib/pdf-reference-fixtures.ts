export type PositionedPdfTextFixture = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

export type PdfReferenceFixture = {
  file: "result.pdf" | "result(1).pdf" | "result(2).pdf" | "result(3).pdf";
  page: number;
  contextText: string;
  expectedTitle: string;
  tableItems: PositionedPdfTextFixture[];
  expectedTableLine: string;
};

export const pdfReferenceFixtures: PdfReferenceFixture[] = [
  {
    file: "result.pdf",
    page: 1,
    contextText: "SC-2760 RF01: Nova aba de Varredura + Cadastro",
    expectedTitle: "SC-2760 RF01: Nova aba de Varredura + Cadastro",
    tableItems: [
      { str: "Projeto", transform: [1, 0, 0, 1, 42, 700], width: 36, height: 10 },
      { str: "Módulo de Recuperação", transform: [1, 0, 0, 1, 150, 700], width: 110, height: 10 },
      { str: "Priorizado", transform: [1, 0, 0, 1, 340, 700], width: 48, height: 10 },
    ],
    expectedTableLine: "Projeto\tMódulo de Recuperação\tPriorizado",
  },
  {
    file: "result(1).pdf",
    page: 1,
    contextText: "SC-4272 [Web] PBI01 - Visualização da Última Posição",
    expectedTitle: "SC-4272 [Web] PBI01 - Visualização da Última Posição",
    tableItems: [
      { str: "Projeto", transform: [1, 0, 0, 1, 42, 700], width: 36, height: 10 },
      { str: "Módulo de Recuperação", transform: [1, 0, 0, 1, 150, 700], width: 110, height: 10 },
      { str: "Priorizado", transform: [1, 0, 0, 1, 340, 700], width: 48, height: 10 },
    ],
    expectedTableLine: "Projeto\tMódulo de Recuperação\tPriorizado",
  },
  {
    file: "result(2).pdf",
    page: 8,
    contextText: "[IMPEDIDO - DOC. TÉC] PBI04 - Ver os comandos enviados\npara todos os equipamentos",
    expectedTitle: "[IMPEDIDO - DOC. TÉC] PBI04 - Ver os comandos enviados para todos os equipamentos",
    tableItems: [
      { str: "Comando", transform: [1, 0, 0, 1, 72, 500], width: 50, height: 12 },
      { str: "Parâmetros", transform: [1, 0, 0, 1, 270, 500], width: 68, height: 12 },
      { str: "ID", transform: [1, 0, 0, 1, 394, 500], width: 14, height: 12 },
      { str: "CONF TEMPO POSICIONAMENTO", transform: [1, 0, 0, 1, 72, 476], width: 170, height: 12 },
      { str: "Tempo em segundos", transform: [1, 0, 0, 1, 270, 476], width: 110, height: 12 },
      { str: "14", transform: [1, 0, 0, 1, 394, 476], width: 14, height: 12 },
    ],
    expectedTableLine: "CONF TEMPO POSICIONAMENTO Tempo em segundos 14",
  },
  {
    file: "result(3).pdf",
    page: 3,
    contextText: "SC-4126 PBI01 - Gestão de Campanhas",
    expectedTitle: "SC-4126 PBI01 - Gestão de Campanhas",
    tableItems: [
      { str: "Centro", transform: [1, 0, 0, 1, 46, 349], width: 38, height: 12 },
      { str: "de Custos", transform: [1, 0, 0, 1, 46, 328], width: 55, height: 12 },
      { str: "Sim", transform: [1, 0, 0, 1, 113, 338.5], width: 21, height: 12 },
      { str: "Corporativo", transform: [1, 0, 0, 1, 210, 349], width: 62, height: 12 },
      { str: "Operação", transform: [1, 0, 0, 1, 210, 328], width: 53, height: 12 },
      { str: "NGP", transform: [1, 0, 0, 1, 210, 307], width: 26, height: 12 },
      { str: "Objetivo", transform: [1, 0, 0, 1, 46, 220], width: 47, height: 12 },
      { str: "Não", transform: [1, 0, 0, 1, 113, 220], width: 23, height: 12 },
      { str: "Texto longo", transform: [1, 0, 0, 1, 210, 220], width: 67, height: 12 },
    ],
    expectedTableLine: "Centro de Custos\tSim\tCorporativo Operação NGP",
  },
];
