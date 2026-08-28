import { describe, expect, it } from "vitest";
import { assessAppRequirements, configurationSteps, recommendMobileTool } from "./app-advisor";

describe("assessAppRequirements", () => {
  it("ativa a análise de aplicativo apenas quando há evidência explícita", () => {
    const assessment = assessAppRequirements("O aplicativo Android deve solicitar permissão de câmera.", null);

    expect(assessment.isAppRelated).toBe(true);
    expect(assessment.platforms).toContain("Android");
    expect(assessment.evidence[0]).toContain("aplicativo Android");
  });

  it("mantém a aba desativada para requisitos que não tratam de aplicativo", () => {
    const assessment = assessAppRequirements("O formulário web deve registrar a solicitação enviada.", null);

    expect(assessment.isAppRelated).toBe(false);
    expect(assessment.evidence).toHaveLength(0);
  });

  it("pede confirmação em vez de assumir uma plataforma móvel", () => {
    const steps = configurationSteps("Maestro", ["Móvel sem plataforma informada"]);

    expect(steps.join(" ")).toContain("confirme Android, iOS ou ambas");
  });

  it("sugere Appium para cobertura explícita de Android e iOS", () => {
    expect(recommendMobileTool("Aplicativo Android e iOS", ["Android", "iOS"])).toBe("Appium");
  });
});
