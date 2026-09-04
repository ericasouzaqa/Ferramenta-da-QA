import type { PerformanceValidation } from "./qa-performance";
import { formatScenario, type GeneratedScenario, type OrganizedQaMaterial } from "./qa-organizer";

export type ExportBundle = {
  scenarios: GeneratedScenario[];
  performance: PerformanceValidation[];
  gaps: string[];
};

export function buildExportBundle(material: OrganizedQaMaterial, performance: PerformanceValidation[]): ExportBundle {
  const scenarios = material.deliveries.flatMap((delivery) => delivery.scenarios);
  const gaps = Array.from(new Set([
    ...material.deliveries.flatMap((delivery) => delivery.requirement.gaps),
    ...scenarios.flatMap((scenario) => scenario.gaps),
  ]));
  return { scenarios, performance, gaps };
}

export function formatExportMarkdown(bundle: ExportBundle): string {
  const steps = bundle.scenarios.length
    ? bundle.scenarios.map(formatScenario).join("\n\n---\n\n")
    : "Nenhum STEP estruturado foi reconhecido.";
  const performance = bundle.performance.length ? bundle.performance.map((item) => [
    `### ${item.title}`,
    `- **Objetivo:** ${item.objective}`,
    `- **Risco identificado:** ${item.risk}`,
    `- **Como testar:** ${item.howToTest}`,
    `- **Ferramenta recomendada:** ${item.recommendedTool}`,
    `- **Resultado esperado:** ${item.expectedResult}`,
    `- **Justificativa:** ${item.rationale}`,
  ].join("\n")).join("\n\n") : "Nenhuma validação preventiva aplicável foi identificada.";
  const gaps = bundle.gaps.length ? bundle.gaps.map((gap) => `- ${gap}`).join("\n") : "Nenhuma indefinição consolidada.";
  return `# Resultado Erika QA\n\n## STEPs\n\n${steps}\n\n## Validações de Performance\n\n${performance}\n\n## Gaps e Indefinições\n\n${gaps}\n`;
}

export function formatExportText(bundle: ExportBundle): string {
  return formatExportMarkdown(bundle).replace(/^#+\s?/gm, "").replace(/\*\*/g, "");
}

export function formatExportExcel(bundle: ExportBundle): string {
  const rows = [
    ["Tipo", "Título", "Pré-condições", "Dados de teste", "Objetivo/Passos", "Risco", "Como testar", "Ferramenta", "Resultado esperado", "Justificativa"],
    ...bundle.scenarios.map((scenario, index) => ["STEP", `STEP ${index + 1} — ${scenario.title}`, scenario.preconditions.join(" | "), scenario.data?.join(" | ") ?? "", scenario.steps.join(" | "), "", "", "", scenario.expectedResult.join(" | "), ""]),
    ...bundle.performance.map((item) => ["PERFORMANCE", item.title, "", "", item.objective, item.risk, item.howToTest, item.recommendedTool, item.expectedResult, item.rationale]),
    ...bundle.gaps.map((gap) => ["GAP", gap, "", "", "", "", "", "", "", ""]),
  ];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return rows.map((row) => row.map(escape).join("\t")).join("\n");
}

export function downloadExport(content: string, fileName: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
