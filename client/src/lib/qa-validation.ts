import type { GeneratedScenario } from "./qa-organizer";

export type ScenarioValidation = {
  warnings: string[];
  valid: boolean;
};

function sourceContains(source: string, value: string) {
  return source.toLocaleLowerCase("pt-BR").includes(value.trim().toLocaleLowerCase("pt-BR"));
}

function baseTitle(title: string) {
  return title.replace(/\s+\(continuação\s+\d+\)$/i, "").trim();
}

/** Verifica rastreabilidade literal sem tentar corrigir ou completar o requisito. */
export function validateScenarioAgainstSource(source: string, scenario: GeneratedScenario): ScenarioValidation {
  const warnings: string[] = [];
  const values = [
    ["Título", baseTitle(scenario.title)],
    ...scenario.preconditions.map((value) => ["Pré-condição", value] as const),
    ...scenario.steps.map((value) => ["Passo", value] as const),
    ...scenario.expectedResult.map((value) => ["Resultado esperado", value] as const),
  ] as Array<[string, string]>;

  for (const [label, value] of values) {
    if (value && !sourceContains(source, value)) warnings.push(`${label} sem correspondência literal na fonte.`);
  }

  return { warnings, valid: warnings.length === 0 };
}
