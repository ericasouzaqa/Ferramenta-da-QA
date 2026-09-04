import type { ClassifiedGap, GeneratedScenario, OrganizedQaMaterial, StepQuality } from "./qa-organizer";

export type AuditClassification = "alta" | "média" | "baixa";

export type AuditGap = {
  category: ClassifiedGap["category"];
  description: string;
  origin: string[];
  impact: string;
};

export type QualityAudit = {
  requirement: {
    classification: AuditClassification;
    reasons: string[];
  };
  steps: {
    total: number;
    complete: number;
    partial: number;
    inconsistent: number;
  };
  coverage: {
    requirementsIdentified: number;
    flowsIdentified: number;
    exceptionsIdentified: number;
    rulesIdentified: number;
    stepsGenerated: number;
    gapsFound: number;
  };
  gaps: AuditGap[];
  traceability: {
    totalScenarios: number;
    fullyTraceable: number;
    partiallyTraceable: number;
    percentage: number;
  };
  attentionPoints: string[];
  summary: string;
};

const QUALITY_GAP_REASONS = {
  funcional: "Ausência funcional encontrada no documento.",
  critério: "Critério ou aceite não explicitado no documento.",
  dados: "Dados, campos, valores ou pré-condições não explicitados no documento.",
  fluxo: "Fluxo, caminho ou exceção não detalhado no documento.",
  técnico: "Informação técnica ou correspondência de origem não confirmada no documento.",
} as const;

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scenarioQuality(scenario: GeneratedScenario): StepQuality {
  if (scenario.quality) return scenario.quality;
  if (scenario.gaps.length) return "parcial";
  return "completo";
}

function gapImpact(category: ClassifiedGap["category"]) {
  return QUALITY_GAP_REASONS[category];
}

function addGap(gaps: Map<string, AuditGap>, gap: ClassifiedGap, origin: string) {
  const key = `${gap.category}:${gap.text}`;
  const current = gaps.get(key);
  if (current) {
    current.origin = unique([...current.origin, origin]);
    return;
  }
  gaps.set(key, {
    category: gap.category,
    description: gap.text,
    origin: [origin],
    impact: gapImpact(gap.category),
  });
}

function scenarioIsFullyTraceable(scenario: GeneratedScenario) {
  const traceability = scenario.traceability;
  if (!traceability) return false;
  return traceability.functionality
    && traceability.preconditions.every(Boolean)
    && traceability.data.every(Boolean)
    && traceability.steps.every(Boolean)
    && traceability.expectedResult.every(Boolean);
}

function scenarioIsPartiallyTraceable(scenario: GeneratedScenario) {
  return !scenarioIsFullyTraceable(scenario) && scenarioQuality(scenario) !== "inconsistente";
}

function classifyRequirement(
  material: OrganizedQaMaterial,
  steps: QualityAudit["steps"],
  traceability: QualityAudit["traceability"],
  gaps: AuditGap[],
) {
  const reasons: string[] = [];
  if (!steps.total) reasons.push("Nenhum STEP foi gerado a partir do documento.");
  if (steps.inconsistent) reasons.push(`${steps.inconsistent} STEP(s) possuem inconsistência explícita.`);
  if (traceability.fullyTraceable < traceability.totalScenarios) reasons.push("Há cenários sem rastreabilidade integral.");
  if (gaps.length) reasons.push(`${gaps.length} GAP(s) foram consolidados a partir da análise documental.`);
  if (!material.deliveries.some((delivery) => delivery.requirement.acceptanceCriteria.length)) {
    reasons.push("Critérios de aceitação não foram identificados nas entregas.");
  }

  if (!steps.total || steps.inconsistent || (traceability.totalScenarios > 0 && traceability.fullyTraceable === 0 && traceability.partiallyTraceable === 0)) {
    return { classification: "baixa" as const, reasons };
  }
  if (steps.partial || traceability.partiallyTraceable || gaps.length) {
    return { classification: "média" as const, reasons };
  }
  return {
    classification: "alta" as const,
    reasons: ["Todos os STEPs são completos, rastreáveis e não há GAPs documentais."],
  };
}

function buildSummary(audit: Omit<QualityAudit, "summary">) {
  return `Análise ${audit.requirement.classification}: ${audit.steps.total} STEP(s), ${audit.steps.complete} completo(s), ${audit.steps.partial} parcial(is), ${audit.steps.inconsistent} inconsistente(s), ${audit.coverage.gapsFound} GAP(s) e ${audit.traceability.percentage}% de rastreabilidade integral documental.`;
}

export function buildQualityAudit(material: OrganizedQaMaterial): QualityAudit {
  const allScenarios = material.deliveries.flatMap((delivery) => delivery.scenarios);
  const steps = allScenarios.reduce<QualityAudit["steps"]>((result, scenario) => {
    const quality = scenarioQuality(scenario);
    result.total += 1;
    if (quality === "completo") result.complete += 1;
    if (quality === "parcial") result.partial += 1;
    if (quality === "inconsistente") result.inconsistent += 1;
    return result;
  }, { total: 0, complete: 0, partial: 0, inconsistent: 0 });

  const fullyTraceable = allScenarios.filter(scenarioIsFullyTraceable).length;
  const partiallyTraceable = allScenarios.filter(scenarioIsPartiallyTraceable).length;
  const traceability = {
    totalScenarios: allScenarios.length,
    fullyTraceable,
    partiallyTraceable,
    percentage: allScenarios.length ? Math.round((fullyTraceable / allScenarios.length) * 100) : 0,
  };

  const consolidatedGaps = new Map<string, AuditGap>();
  material.deliveries.forEach((delivery) => {
    delivery.requirement.gapDetails?.forEach((gap) => addGap(consolidatedGaps, gap, delivery.id));
    delivery.scenarios.forEach((scenario) => {
      scenario.gapDetails?.forEach((gap) => addGap(consolidatedGaps, gap, `${delivery.id}/${scenario.id}`));
    });
  });
  const gaps = Array.from(consolidatedGaps.values());
  const coverage = {
    requirementsIdentified: material.deliveries.length,
    flowsIdentified: material.deliveries.reduce((total, delivery) => total + delivery.requirement.flows.length, 0),
    exceptionsIdentified: material.deliveries.reduce((total, delivery) => total + delivery.requirement.exceptions.length, 0),
    rulesIdentified: material.deliveries.reduce((total, delivery) => total + delivery.requirement.businessRules.length, 0),
    stepsGenerated: allScenarios.length,
    gapsFound: gaps.length,
  };
  const requirement = classifyRequirement(material, steps, traceability, gaps);
  const attentionPoints = unique([
    ...requirement.reasons,
    ...gaps.map((gap) => `${gap.category}: ${gap.description}`),
    ...(traceability.partiallyTraceable ? [`${traceability.partiallyTraceable} cenário(s) exigem conferência de origem.`] : []),
  ]);
  const audit = { requirement, steps, coverage, gaps, traceability, attentionPoints };
  return { ...audit, summary: buildSummary(audit) };
}
