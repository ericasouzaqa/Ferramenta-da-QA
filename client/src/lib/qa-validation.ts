import type { GeneratedScenario } from "./qa-organizer";

export type ScenarioTraceability = {
  functionality: boolean;
  preconditions: boolean[];
  steps: boolean[];
  expectedResult: boolean[];
  data: boolean[];
  gaps: boolean[];
};

export type ScenarioValidation = {
  warnings: string[];
  valid: boolean;
  traceability: ScenarioTraceability;
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

function sourceContains(source: string, value: string) {
  return normalize(source).includes(normalize(value.trim()));
}

const STOP_WORDS = new Set(["para", "uma", "um", "com", "sem", "dos", "das", "de", "do", "da", "no", "na", "ao", "o", "a", "e"]);

function semanticTokens(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map((token) => token.slice(0, 5));
}

function sourceSupports(source: string, value: string, semantic: boolean) {
  if (sourceContains(source, value)) return true;
  if (!semantic) return false;
  const expected = Array.from(new Set(semanticTokens(value)));
  const sourceSet = new Set(semanticTokens(source));
  if (!expected.length) return false;
  return expected.filter((token) => sourceSet.has(token)).length / expected.length >= 0.4;
}

function baseTitle(title: string) {
  return title
    .replace(/\s+\(continuação\s+\d+\)$/i, "")
    .replace(/\s+—\s+(?:fluxo principal|fluxo alternativo|exceção|exceções|caminho alternativo)$/i, "")
    .trim();
}

/** Verifica a rastreabilidade sem completar o requisito; equivalência semântica é permitida somente para narrativa organizada. */
export function validateScenarioAgainstSource(source: string, scenario: GeneratedScenario): ScenarioValidation {
  const warnings: string[] = [];
  const semantic = scenario.sourceMode === "narrative";
  const functionality = !baseTitle(scenario.title) || sourceSupports(source, baseTitle(scenario.title), semantic);
  const preconditions = scenario.preconditions.map((value) => sourceSupports(source, value, semantic));
  const steps = scenario.steps.map((value) => sourceSupports(source, value, semantic));
  const expectedResult = scenario.expectedResult.map((value) => sourceSupports(source, value, semantic));
  const data = (scenario.data ?? []).map((value) => sourceSupports(source, value, semantic));
  const gaps = scenario.gaps.map((value) => sourceContains(source, value));
  const values = [
    ["Título", baseTitle(scenario.title), functionality],
    ...scenario.preconditions.map((value, index) => ["Pré-condição", value, preconditions[index]] as const),
    ...scenario.data?.map((value, index) => ["Dado", value, data[index]] as const) ?? [],
    ...scenario.steps.map((value, index) => ["Passo", value, steps[index]] as const),
    ...scenario.expectedResult.map((value, index) => ["Resultado esperado", value, expectedResult[index]] as const),
  ] as Array<[string, string, boolean]>;

  for (const [label, value, found] of values) {
    if (value && !found) warnings.push(`${label} sem rastreabilidade suficiente na fonte.`);
  }

  return {
    warnings,
    valid: warnings.length === 0,
    traceability: { functionality, preconditions, steps, expectedResult, data, gaps },
  };
}
