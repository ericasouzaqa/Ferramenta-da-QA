import { describe, expect, it } from "vitest";
import { buildQualityAudit } from "./qa-audit";
import { organizeQaMaterial } from "./qa-organizer";

function organize(source: string) {
  const material = organizeQaMaterial(source);
  if (!material) throw new Error("Material de teste não foi organizado.");
  return material;
}

describe("buildQualityAudit", () => {
  it("classifica uma análise completa como alta e calcula cobertura documental", () => {
    const audit = buildQualityAudit(organize([
      "STEP 1",
      "Título: Login",
      "Como uma pessoa usuária",
      "Eu quero acessar o sistema",
      "Para que eu possa consultar meus dados",
      "Pré-condições",
      "Usuário cadastrado.",
      "Fluxos",
      "Acessar a área autenticada.",
      "Regras de negócio",
      "Acesso permitido.",
      "Passos",
      "Informar credenciais.",
      "Resultado esperado",
      "Exibir acesso.",
    ].join("\n")));

    expect(audit.requirement.classification).toBe("alta");
    expect(audit.steps).toEqual({ total: 1, complete: 1, partial: 0, inconsistent: 0 });
    expect(audit.coverage).toMatchObject({
      requirementsIdentified: 1,
      flowsIdentified: 1,
      rulesIdentified: 1,
      stepsGenerated: 1,
      gapsFound: 0,
    });
    expect(audit.traceability).toEqual({
      totalScenarios: 1,
      fullyTraceable: 1,
      partiallyTraceable: 0,
      percentage: 100,
    });
    expect(audit.summary).toContain("Análise alta");
  });

  it("classifica análise incompleta como média e consolida GAPS com categoria e origem", () => {
    const audit = buildQualityAudit(organize([
      "STEP 1",
      "Título: Consulta",
      "Passos",
      "Consultar dados.",
      "Gaps e indefinições:",
      "Resultado esperado não definido.",
    ].join("\n")));

    expect(audit.requirement.classification).toBe("média");
    expect(audit.steps.partial).toBe(1);
    expect(audit.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: "funcional",
        description: "Resultado esperado não definido.",
        origin: expect.arrayContaining(["delivery-1/delivery-1-story-1-scenario-1"]),
      }),
    ]));
    expect(audit.traceability.percentage).toBe(0);
    expect(audit.attentionPoints.length).toBeGreaterThan(0);
  });

  it("classifica inconsistência explícita como baixa sem bloquear o resumo", () => {
    const audit = buildQualityAudit(organize([
      "STEP 1",
      "Título: Pagamento",
      "Passos",
      "Processar pagamento.",
      "Resultado esperado",
      "Exibir confirmação.",
      "Gaps e indefinições:",
      "Conflito entre regras de negócio.",
    ].join("\n")));

    expect(audit.requirement.classification).toBe("baixa");
    expect(audit.steps.inconsistent).toBe(1);
    expect(audit.gaps[0]).toMatchObject({ category: "funcional", impact: expect.any(String) });
    expect(audit.summary).toContain("inconsistente(s)");
  });

  it("mantém a auditoria baseada em dados derivados e não duplica GAPS iguais", () => {
    const material = organize([
      "STEP 1",
      "Título: Login",
      "Gaps e indefinições:",
      "Mensagem não definida.",
    ].join("\n"));
    const audit = buildQualityAudit(material);

    expect(audit.coverage.gapsFound).toBe(audit.gaps.length);
    expect(audit.gaps.filter((gap) => gap.description === "Mensagem não definida.")).toHaveLength(1);
    expect(audit.gaps[0].origin.length).toBeGreaterThan(0);
    expect(audit.summary).not.toContain("cobertura do sistema");
  });
});
