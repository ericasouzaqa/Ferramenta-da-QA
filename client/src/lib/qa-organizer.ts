/**
 * Design philosophy — Caderno de Evidências:
 * this module documents supplied evidence in discrete bug cards. It never
 * completes business rules, merges titled problems, or presents a QA suggestion
 * as a product fact.
 */

export type EvidenceType = "fornecido" | "organizado" | "a confirmar";
export type GenerationScope = "completo" | "criterios" | "cenarios" | "revisao";
export type ScenarioKind = "fluxo principal" | "fluxo alternativo" | "regressão" | "validação" | "persistência" | "integração" | "mensagem" | "UI" | "UX" | "permissão" | "segurança" | "performance" | "dados" | "impacto" | "consistência";

export type OrganizedSection = {
  id: "description" | "fixes" | "acceptance" | "tests" | "review";
  title: string;
  content: string[];
  evidence: EvidenceType;
};

export type GeneratedScenario = {
  id: string;
  title: string;
  source: string;
  check: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string[];
  gaps: string[];
  gherkin: string;
  status: "pronto" | "a confirmar";
  kind: ScenarioKind;
  cardId: string;
  reference: string;
};

export type BugCard = {
  id: string;
  title: string;
  sections: OrganizedSection[];
  scenarios: GeneratedScenario[];
  cardText: string;
};

export type OrganizedQaMaterial = {
  cards: BugCard[];
  scenarios: GeneratedScenario[];
  sourceLineCount: number;
  scope: GenerationScope;
};

type LineCategory = "separator" | "title" | "observed" | "expected" | "steps" | "impact" | "context";
type CategorizedLine = { value: string; category: LineCategory };

const NOT_INFORMED = "Não informado no conteúdo de origem.";

const linePatterns = {
  title: /^(?:t[ií]tulo|problema|bug|erro|falha)\s*[:\-]/i,
  observed: /(?:comportamento\s+observado|resultado\s+atual|ocorre|acontece|exibe|retorna|falha|erro|n[aã]o\s+funciona|n[aã]o\s+carrega|duplicad)/i,
  expected: /(?:comportamento\s+esperado|resultado\s+esperado|crit[eé]rio(?:s)?\s+de\s+aceite|deve|deveria|esperado|necess[aá]rio|obrigat[oó]rio)/i,
  steps: /^(?:passo\s*\d*|\d+[.)]|ao\s+|quando\s+|acessar\s+|clicar\s+|preencher\s+|enviar\s+|selecionar\s+|abrir\s+|tentar\s+)/i,
  impact: /(?:impacto|usu[aá]rio|cliente|risco|bloqueia|impede|perda|evid[eê]ncia|anexo|url|link|print|captura|p[aá]gina\s+\d+)/i,
};

const scenarioPatterns: Array<[ScenarioKind, RegExp]> = [
  ["fluxo alternativo", /(?:alternativ|cancelar|voltar|fallback|exce[cç][aã]o)/i],
  ["regressão", /(?:regress|altera[cç][aã]o|atualiza[cç][aã]o|fluxo existente|funcionalidade existente)/i],
  ["persistência", /(?:persist|salv|gravad|cache|banco|ret[eé]m)/i],
  ["integração", /(?:integra|api|webhook|callback|servi[cç]o|endpoint)/i],
  ["mensagem", /(?:mensagem|notifica|alerta|toast|e-?mail|sms)/i],
  ["UI", /(?:tela|interface|bot[aã]o|campo|formul[aá]rio|layout|ui\b|ux\b)/i],
  ["UX", /(?:ux\b|usabilidade|jornada|experi[eê]ncia)/i],
  ["permissão", /(?:permiss[aã]o|perfil|acesso|papel|role)/i],
  ["segurança", /(?:seguran[cç]a|vulnerab|autentica|autoriza|token|dados sens[ií]veis)/i],
  ["performance", /(?:performance|lent|lat[eê]ncia|tempo de resposta|carregamento)/i],
  ["dados", /(?:dados|valor|cadastro|registro|informa[cç][aã]o)/i],
  ["impacto", /(?:impacto|usu[aá]rio|cliente|risco|bloqueia|impede|perda)/i],
  ["validação", /(?:valid|inv[aá]lid|incomplet|vazio|obrigat[oó]rio|formato|limite|erro 4\d\d)/i],
  ["consistência", /(?:consist[eê]n|duplicad|diverg|incompat[ií]vel)/i],
];

function normalizeSource(text: string): string[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const normalized: string[] = [];
  let previousWasSeparator = true;
  for (const line of lines) {
    const value = line.replace(/^[\s•▪●\-–]+/, "").replace(/\s+/g, " ").trim();
    if (!value) {
      if (!previousWasSeparator) normalized.push("");
      previousWasSeparator = true;
      continue;
    }
    normalized.push(value);
    previousWasSeparator = false;
  }
  return normalized;
}

function removeExplicitLabel(value: string): string {
  return value.replace(/^(?:t[ií]tulo|problema|bug|erro|falha|comportamento\s+observado|resultado\s+atual|comportamento\s+esperado|resultado\s+esperado|crit[eé]rio(?:s)?\s+de\s+aceite|passo\s*\d*)\s*[:\-]\s*/i, "").trim();
}

function classifyLine(value: string): LineCategory {
  if (!value) return "separator";
  if (linePatterns.title.test(value)) return "title";
  if (linePatterns.expected.test(value)) return "expected";
  if (linePatterns.steps.test(value)) return "steps";
  if (linePatterns.observed.test(value)) return "observed";
  if (linePatterns.impact.test(value)) return "impact";
  return "context";
}

function section(id: OrganizedSection["id"], title: string, content: string[], allowEmpty = false, evidence?: EvidenceType): OrganizedSection {
  const resolvedContent = content.length ? content : allowEmpty ? [] : [NOT_INFORMED];
  return { id, title, content: resolvedContent, evidence: evidence ?? (content.length ? "fornecido" : "a confirmar") };
}

function determineScope(source: string, requestedScope?: GenerationScope): GenerationScope {
  if (requestedScope && requestedScope !== "completo") return requestedScope;
  if (/\b(?:apenas|somente)\s+(?:os\s+)?crit[eé]rios\b/i.test(source)) return "criterios";
  if (/\b(?:apenas|somente)\s+(?:os\s+)?cen[aá]rios\b/i.test(source)) return "cenarios";
  if (/\b(?:apenas|somente)\s+(?:uma\s+)?revis[aã]o\b/i.test(source)) return "revisao";
  return requestedScope ?? "completo";
}

const explicitStepMarker = /^STEP\s+\d+\s*$/i;

function splitProblems(lines: CategorizedLine[]): CategorizedLine[][] {
  const groups: CategorizedLine[][] = [];
  const structuredSource = lines.some((line) => Object.values(stepHeaders).some((header) => header.test(line.value)));
  let current: CategorizedLine[] = [];
  for (const line of lines) {
    if (explicitStepMarker.test(line.value) && current.length) {
      groups.push(current);
      current = [line];
      continue;
    }
    if (line.category === "separator") {
      if (!structuredSource) {
        if (current.length) groups.push(current);
        current = [];
      }
      continue;
    }
    if (line.category === "title" && current.some((item) => item.category === "title")) {
      groups.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function inferTitle(lines: CategorizedLine[], _index: number): string {
  const explicit = lines.find((line) => line.category === "title");
  return explicit ? removeExplicitLabel(explicit.value) || "Título não informado" : "Título não informado";
}

function scenarioCheck(kind: ScenarioKind): string {
  const checks: Record<ScenarioKind, string> = {
    "fluxo principal": "Executar a ação relacionada ao problema e confirmar que a falha não ocorre.",
    "fluxo alternativo": "Executar o caminho alternativo mencionado na origem e confirmar que o retorno permanece compreensível.",
    "regressão": "Repetir os fluxos existentes diretamente relacionados à funcionalidade afetada e confirmar que continuam funcionando.",
    "validação": "Verificar os limites, formatos ou obrigatoriedades citados na origem.",
    "persistência": "Confirmar que o resultado permanece correto depois de salvar, atualizar ou reabrir o conteúdo, quando aplicável.",
    "integração": "Executar a ação que depende da integração citada e confirmar a resposta esperada.",
    "mensagem": "Confirmar o conteúdo, a apresentação e o momento da mensagem citada.",
    "UI": "Conferir campos, botões, estado visual e retorno da tela relacionados ao problema.",
    "UX": "Conferir se a jornada descrita pode ser concluída de forma clara para a pessoa usuária.",
    "permissão": "Verificar o comportamento para o perfil ou acesso citado na origem.",
    "segurança": "Confirmar o comportamento de autenticação, autorização ou proteção de dados mencionado.",
    "performance": "Medir o tempo de resposta ou carregamento citado e confirmar que a falha não permanece.",
    "dados": "Validar os valores, registros ou informações citados no problema.",
    "impacto": "Confirmar que o efeito informado para a pessoa usuária, operação ou negócio não permanece.",
    "consistência": "Comparar os pontos relacionados e confirmar que o comportamento não fica duplicado ou divergente.",
  };
  return checks[kind];
}

const stepHeaders = {
  preconditions: /^pré[- ]condições?\s*:?$/i,
  steps: /^passos?\s*:?$/i,
  expected: /^(?:resultado|resultados)\s+esperado(?:s)?\s*:?$/i,
  gaps: /^gaps?\s+e\s+indefinições\s*:?$/i,
};

function extractBlock(lines: CategorizedLine[], header: RegExp): string[] {
  const start = lines.findIndex((line) => header.test(line.value));
  if (start < 0) return [];
  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const value = lines[index].value;
    if (Object.values(stepHeaders).some((candidate) => candidate.test(value))) break;
    if (!value) continue;
    values.push(removeExplicitLabel(value));
  }
  return values;
}

function explicitStepLines(lines: CategorizedLine[]): string[] {
  const explicit = extractBlock(lines, stepHeaders.steps);
  if (explicit.length) return explicit;
  return lines.filter((line) => line.category === "steps").map((line) => removeExplicitLabel(line.value));
}

function buildGherkin(title: string, preconditions: string[], steps: string[], expectedResult: string[]): string {
  if (!preconditions.length || !steps.length || !expectedResult.length) return "";
  const lines = [`Funcionalidade: ${title}`, `  Cenário: ${title}`];
  preconditions.forEach((item) => lines.push(`    Dado ${item}`));
  steps.forEach((item, index) => lines.push(`    ${index === 0 ? "Quando" : "E"} ${item}`));
  expectedResult.forEach((item) => lines.push(`    Então ${item}`));
  return lines.join("\\n");
}

function findReference(lines: CategorizedLine[]): string {
  const explicit = lines.find((line) => /\b(?:item|pba|card)\b\s*[:#-]?\s*[A-Z0-9][A-Z0-9._/-]*/i.test(line.value));
  if (!explicit) return "Referência não informada nos artefatos.";
  const match = explicit.value.match(/\b(?:item|pba|card)\b\s*[:#-]?\s*[A-Z0-9][A-Z0-9._/-]*/i);
  return match?.[0] ?? "Referência não informada nos artefatos.";
}

function matchingScenarios(lines: CategorizedLine[], cardId: string, title: string): GeneratedScenario[] {
  const preconditions = extractBlock(lines, stepHeaders.preconditions);
  const steps = explicitStepLines(lines);
  const expectedResult = extractBlock(lines, stepHeaders.expected).length
    ? extractBlock(lines, stepHeaders.expected)
    : lines.filter((line) => line.category === "expected").map((line) => removeExplicitLabel(line.value));
  const sourceLines = lines.filter((line) => line.category !== "separator");
  const gaps = [
    ...extractBlock(lines, stepHeaders.gaps),
    ...(title === "Título não informado" ? ["Título não informado nos artefatos."] : []),
    ...(preconditions.length ? [] : ["Pré-condições não informadas nos artefatos."]),
    ...(steps.length ? [] : ["Passos não informados nos artefatos."]),
    ...(expectedResult.length ? [] : ["Resultado esperado não informado nos artefatos."]),
    ...(steps.length > 8 ? ["Foram informados mais de 8 passos; somente os 8 primeiros foram considerados."] : []),
  ];
  const boundedSteps = steps.slice(0, 8);
  const source = sourceLines.map((line) => removeExplicitLabel(line.value)).filter(Boolean).join(" ") || NOT_INFORMED;
  const kind = scenarioPatterns.find(([, pattern]) => pattern.test(source))?.[0] ?? "fluxo principal";
  const gherkin = buildGherkin(title, preconditions, boundedSteps, expectedResult);
  const reference = findReference(lines);
  return [{
    id: `${cardId}-scenario-1`,
    title,
    source,
    check: expectedResult.join(" ") || NOT_INFORMED,
    preconditions,
    steps: boundedSteps,
    expectedResult,
    gaps,
    gherkin,
    status: gaps.length ? "a confirmar" : "pronto",
    kind,
    cardId,
    reference,
  }];
}

export function formatScenario(scenario: GeneratedScenario): string {
  const list = (items: string[]) => items.length ? items.map((item, index) => `${index + 1}. ${item}`).join("\\n") : "Não informado nos artefatos.";
  const gaps = scenario.gaps.length ? scenario.gaps.map((item) => `- ${item}`).join("\\n") : "- Nenhuma lacuna registrada.";
  return [
    `STEP ${scenario.id.match(/bug-(\\d+)/)?.[1] ?? "1"}`,
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
  ].join("\\n");
}

function buildCard(lines: CategorizedLine[], index: number, scope: GenerationScope): BugCard {
  const cardId = `bug-${index + 1}`;
  const title = inferTitle(lines, index);
  const observedLines = lines.filter((line) => line.category === "observed");
  const contextLines = lines.filter((line) => line.category === "context");
  const observed = (observedLines.length ? observedLines : contextLines).map((line) => `Comportamento atual: ${removeExplicitLabel(line.value)}`);
  const expected = lines.filter((line) => line.category === "expected").map((line) => removeExplicitLabel(line.value));
  const impact = lines.filter((line) => line.category === "impact").map((line) => `Impacto: ${removeExplicitLabel(line.value)}`);
    const scenarios = matchingScenarios(lines, cardId, title).slice(0, 10);
  const defaultExpected = "A funcionalidade deve concluir a ação informada sem apresentar a falha descrita.";
  const expectedBehaviors = expected.length ? expected : [defaultExpected];
  const description = section("description", "Descrição", [...observed, ...expected.map((line) => `Comportamento esperado: ${line}`), ...impact]);
  const fixes = section("fixes", "Itens de correção", expected.length ? expected.map((line) => `Ajustar o comportamento para que: ${line}`) : ["Corrigir o comportamento descrito para eliminar a falha relatada."], false, expected.length ? undefined : "organizado");
  const acceptance = section("acceptance", "Critérios de aceite", expectedBehaviors, false, expected.length ? undefined : "organizado");
  const tests = section("tests", "Cenários de teste", scenarios.map((scenario) => formatScenario(scenario)), false, "organizado");
  const gaps = [description, fixes, acceptance, tests].filter((item) => item.evidence === "a confirmar").map((item) => `${item.title}: ${NOT_INFORMED}`);
  const review = section("review", "Revisão de lacunas", gaps.length ? gaps : ["O material contém as seções mínimas; valide se os trechos ainda representam o problema atual."], gaps.length === 0);
  const allSections = [description, fixes, acceptance, tests];
  const sections = scope === "criterios" ? [acceptance] : scope === "cenarios" ? [tests] : scope === "revisao" ? [review] : allSections;
  const cardText = [`# ${title}`, ...sections.map((item) => `## ${item.title}\n${item.content.map((value) => `- ${value}`).join("\n")}`)].join("\n\n");
  return { id: cardId, title, sections, scenarios, cardText };
}

export function organizeQaMaterial(source: string, requestedScope?: GenerationScope): OrganizedQaMaterial | null {
  const lines = normalizeSource(source).map((value) => ({ value, category: classifyLine(value) }));
  if (!lines.some((line) => line.category !== "separator")) return null;
  const scope = determineScope(source, requestedScope);
  const cards = splitProblems(lines).map((problemLines, index) => buildCard(problemLines, index, scope));
  return { cards, scenarios: cards.flatMap((card) => card.scenarios), sourceLineCount: lines.filter((line) => line.category !== "separator").length, scope };
}
