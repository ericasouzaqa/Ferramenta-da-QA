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

function sourceContains(source: string, value: string) {
  return source.toLocaleLowerCase("pt-BR").includes(value.trim().toLocaleLowerCase("pt-BR"));
}

function baseTitle(title: string) {
  return title
    .replace(/\s+\(continuação\s+\d+\)$/i, "")
    .replace(/\s+—\s+(?:fluxo principal|fluxo alternativo|exceção|exceções|caminho alternativo)$/i, "")
    .trim();
}

/** Verifica rastreabilidade literal sem tentar corrigir ou completar o requisito. */
export function validateScenarioAgainstSource(source: string, scenario: GeneratedScenario): ScenarioValidation {
  const warnings: string[] = [];
  const functionality = !baseTitle(scenario.title) || sourceContains(source, baseTitle(scenario.title));
  const preconditions = scenario.preconditions.map((value) => sourceContains(source, value));
  const steps = scenario.steps.map((value) => sourceContains(source, value));
  const expectedResult = scenario.expectedResult.map((value) => sourceContains(source, value));
  const data = (scenario.data ?? []).map((value) => sourceContains(source, value));
  const gaps = scenario.gaps.map((value) => sourceContains(source, value));
  const values = [
    ["Título", baseTitle(scenario.title), functionality],
    ...scenario.preconditions.map((value, index) => ["Pré-condição", value, preconditions[index]] as const),
    ...scenario.data?.map((value, index) => ["Dado", value, data[index]] as const) ?? [],
    ...scenario.steps.map((value, index) => ["Passo", value, steps[index]] as const),
    ...scenario.expectedResult.map((value, index) => ["Resultado esperado", value, expectedResult[index]] as const),
  ] as Array<[string, string, boolean]>;

  for (const [label, value, found] of values) {
    if (value && !found) warnings.push(`${label} sem correspondência literal na fonte.`);
  }

  return {
    warnings,
    valid: warnings.length === 0,
    traceability: { functionality, preconditions, steps, expectedResult, data, gaps },
  };
}
