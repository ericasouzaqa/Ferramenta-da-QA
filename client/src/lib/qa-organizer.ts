export type GeneratedScenario = {
  id: string;
  title: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string[];
  gaps: string[];
  gherkin: string;
  status: "pronto" | "a confirmar";
  reference: string;
};

export type Delivery = {
  id: string;
  title: string;
  sourceText: string;
  scenarios: GeneratedScenario[];
};

export type OrganizedQaMaterial = {
  deliveries: Delivery[];
  scenarios: GeneratedScenario[];
  sourceLineCount: number;
};

const NOT_INFORMED = "Não informado no conteúdo de origem.";
const STEP_MARKER = /^STEP(?:\s+(\d+))?\s*$/i;
const SECTION_HEADERS = {
  preconditions: /^pré[- ]condições?\s*:??$/i,
  steps: /^passos?\s*:??$/i,
  expected: /^(?:resultado|resultados)\s+esperado(?:s)?\s*:??$/i,
  acceptance: /^critérios?\s+de\s+aceite\s*:??$/i,
  gaps: /^gaps?\s+e\s+indefinições\s*:??$/i,
};
const TITLE_HEADER = /^(?:título|titulo)\s*:\s*(.*)$/i;
const DELIVERY_HEADER = /^(?:[⭐*•]\s*)?(?:(?:SC[- ]\d+)|(?:PBI\s*\d+)|(?:PBA\s*\d+)|(?:Item\s*[A-Za-z0-9._/-]+))\b.*$/i;
const REFERENCE = /\b(?:(?:SC[- ]\d+)|(?:item|pbi|pba|card)\s*(?:[#:]|-)?\s*(?=[A-Za-z0-9._/-]*\d)[A-Za-z0-9][A-Za-z0-9._/-]*)(?![A-Za-z0-9])/i;
const REFERENCE_LINE = /^(?:(?:SC[- ]\d+)|(?:item|pbi|pba|card)\s*(?:[#:]|-)?\s*(?=[A-Za-z0-9._/-]*\d)[A-Za-z0-9][A-Za-z0-9._/-]*)(?![A-Za-z0-9])$/i;

function cleanLine(line: string) {
  return line.trim().replace(/^[•▪●]\s*/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function splitLines(source: string) {
  return source.replaceAll("\r", "").split("\n");
}

function splitDeliveries(lines: string[]) {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    const value = cleanLine(line);
    const startsNewStep = STEP_MARKER.test(value) && current.some((item) => cleanLine(item));
    const startsNewTitle = TITLE_HEADER.test(value) && current.some((item) => TITLE_HEADER.test(cleanLine(item)));
    const startsNewReference = REFERENCE_LINE.test(value) && current.some((item) => REFERENCE_LINE.test(cleanLine(item)));
    const startsNewDeliveryHeader = DELIVERY_HEADER.test(value) && !REFERENCE_LINE.test(value) && current.some((item) => cleanLine(item));
    if (startsNewStep || startsNewTitle || startsNewReference || startsNewDeliveryHeader) {
      groups.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.some((item) => cleanLine(item))) groups.push(current);
  return groups;
}

function findTitle(lines: string[]) {
  const cleaned = lines.map(cleanLine);
  const explicit = cleaned.map((line) => line.match(TITLE_HEADER)?.[1]?.trim()).find(Boolean);
  if (explicit) return explicit;
  return cleaned.find((line) => DELIVERY_HEADER.test(line) && !REFERENCE_LINE.test(line)) || "Título não informado";
}

function findReference(lines: string[]) {
  for (const line of lines.map(cleanLine)) {
    const match = line.match(REFERENCE);
    if (match) return match[0];
  }
  return "Referência não informada nos artefatos.";
}

function extractSection(lines: string[], header: RegExp) {
  const start = lines.findIndex((line) => header.test(cleanLine(line)));
  if (start < 0) return [];
  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    if (Object.values(SECTION_HEADERS).some((candidate) => candidate.test(line))) break;
    if (line) values.push(line);
  }
  return values;
}

const EXPLICIT_ACTION = /^(?:ao\b|quando\b|inserir\b|adicionar\b|remover\b|criar\b|exibir\b|mostrar\b|enviar\b|consultar\b|validar\b|posicionar\b|permitir\b|atualizar\b|garantir\b|definir\b|selecionar\b|preencher\b|clicar\b|acessar\b|manter\b|habilitar\b|desabilitar\b|armazenar\b|salvar\b|o sistema deverá\b)/i;

function extractNumberedSteps(lines: string[]) {
  const values: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    const numbered = rawLine.trim().replace(/^[•▪●]\s*/, "").match(/^\d+[.)]\s+(.+)$/);
    if (!line || Object.values(SECTION_HEADERS).some((header) => header.test(line))) {
      if (current) values.push(current);
      current = "";
      continue;
    }
    if (numbered) {
      if (current) values.push(current);
      current = numbered[1].trim();
    } else if (current && !DELIVERY_HEADER.test(line) && !TITLE_HEADER.test(line)) {
      current = `${current} ${line}`.trim();
    }
  }
  if (current) values.push(current);
  return values;
}

function extractExplicitActions(lines: string[]) {
  const values: string[] = [];
  let inAcceptance = false;
  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (SECTION_HEADERS.acceptance.test(line) || SECTION_HEADERS.expected.test(line)) {
      inAcceptance = true;
      continue;
    }
    if (inAcceptance || !line || Object.values(SECTION_HEADERS).some((header) => header.test(line))) continue;
    if (EXPLICIT_ACTION.test(line)) values.push(line);
  }
  return values;
}

function gherkin(title: string, preconditions: string[], steps: string[], expected: string[]) {
  if (title === "Título não informado" || !preconditions.length || !steps.length || !expected.length) return "";
  return [
    `Funcionalidade: ${title}`,
    `  Cenário: ${title}`,
    ...preconditions.map((item) => `    Dado ${item}`),
    ...steps.map((item, index) => `    ${index === 0 ? "Quando" : "E"} ${item}`),
    ...expected.map((item) => `    Então ${item}`),
  ].join("\n");
}

function buildScenarios(lines: string[], deliveryId: string): GeneratedScenario[] {
  const cleaned = lines.map(cleanLine).filter(Boolean);
  const hasStepMarker = cleaned.some((line) => STEP_MARKER.test(line));
  const hasScenarioHeader = cleaned.some((line) => TITLE_HEADER.test(line) || DELIVERY_HEADER.test(line) || Object.values(SECTION_HEADERS).some((header) => header.test(line)));
  if (!hasStepMarker && !hasScenarioHeader) return [];

  const title = findTitle(lines);
  const preconditions = extractSection(lines, SECTION_HEADERS.preconditions);
  const sectionSteps = extractSection(lines, SECTION_HEADERS.steps);
  const numberedSteps = extractNumberedSteps(lines);
  const allSteps = sectionSteps.length ? sectionSteps : numberedSteps.length ? numberedSteps : extractExplicitActions(lines);
  const explicitExpected = extractSection(lines, SECTION_HEADERS.expected);
  const expectedResult = explicitExpected.length ? explicitExpected : extractSection(lines, SECTION_HEADERS.acceptance);
  const explicitGaps = extractSection(lines, SECTION_HEADERS.gaps);
  const chunks = allSteps.length ? Array.from({ length: Math.ceil(allSteps.length / 8) }, (_, index) => allSteps.slice(index * 8, index * 8 + 8)) : [[]];

  return chunks.map((steps, index) => {
    const gaps = [
      ...explicitGaps,
      ...(title === "Título não informado" ? ["Título não informado nos artefatos."] : []),
      ...(!preconditions.length ? ["Pré-condições não informadas nos artefatos."] : []),
      ...(!allSteps.length ? ["Passos não informados nos artefatos."] : []),
      ...(!expectedResult.length ? ["Resultado esperado não informado nos artefatos."] : []),
    ];
    return {
      id: `${deliveryId}-scenario-${index + 1}`,
      title: chunks.length > 1 ? `${title} (continuação ${index + 1})` : title,
      preconditions,
      steps,
      expectedResult,
      gaps,
      gherkin: gherkin(title, preconditions, steps, expectedResult),
      status: gaps.length ? "a confirmar" : "pronto",
      reference: findReference(lines),
    };
  });
}

export function formatScenario(scenario: GeneratedScenario) {
  const list = (items: string[]) => items.length ? items.map((item, index) => `${index + 1}. ${item}`).join("\n") : NOT_INFORMED;
  const gaps = scenario.gaps.length ? scenario.gaps.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Nenhuma lacuna registrada.";
  return [
    `STEP ${scenario.id.match(/scenario-(\d+)$/)?.[1] ?? "1"}`,
    "",
    scenario.title,
    "",
    `Referência: ${scenario.reference}`,
    "",
    "Pré-condições",
    list(scenario.preconditions),
    "",
    "Passos",
    list(scenario.steps),
    "",
    "Resultado esperado",
    list(scenario.expectedResult),
    "",
    "Gaps e indefinições:",
    gaps,
    ...(scenario.gherkin ? ["", "Gherkin", scenario.gherkin] : []),
  ].join("\n");
}

export function organizeQaMaterial(source: string): OrganizedQaMaterial | null {
  if (!source.trim()) return null;
  const lines = splitLines(source);
  const groups = splitDeliveries(lines);
  const deliveries = groups.map((group, deliveryIndex) => {
    const sourceText = group.join("\n").trim();
    const id = `delivery-${deliveryIndex + 1}`;
    const scenarios = buildScenarios(group, id);
    return { id, title: findTitle(group), sourceText, scenarios };
  });
  const scenarios = deliveries.flatMap((delivery) => delivery.scenarios).slice(0, deliveries.length * 10);
  return { deliveries, scenarios, sourceLineCount: lines.filter((line) => cleanLine(line)).length };
}

export { NOT_INFORMED };
