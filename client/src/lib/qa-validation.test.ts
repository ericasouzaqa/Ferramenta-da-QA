import { describe, expect, it } from "vitest";
import { validateScenarioAgainstSource } from "./qa-validation";

describe("validateScenarioAgainstSource", () => {
  it("aceita um cenário cujos valores estão presentes na fonte", () => {
    const source = "Título: Login\nPassos\nInformar usuário.\nResultado esperado\nExibir acesso.";
    const result = validateScenarioAgainstSource(source, {
      id: "delivery-1-scenario-1",
      title: "Login",
      reference: "Referência não informada nos artefatos.",
      preconditions: [],
      steps: ["Informar usuário."],
      expectedResult: ["Exibir acesso."],
      gaps: [],
      gherkin: "",
      status: "a confirmar",
    });
    expect(result).toEqual({
      warnings: [],
      valid: true,
      traceability: {
        functionality: true,
        preconditions: [],
        steps: [true],
        expectedResult: [true],
        data: [],
        gaps: [],
      },
    });
  });

  it("registra um gap quando um valor não possui correspondência na fonte", () => {
    const result = validateScenarioAgainstSource("Título: Login\nPassos\nInformar usuário.", {
      id: "delivery-1-scenario-1",
      title: "Login",
      reference: "Referência não informada nos artefatos.",
      preconditions: ["Possuir acesso."],
      steps: ["Informar usuário."],
      expectedResult: [],
      gaps: [],
      gherkin: "",
      status: "a confirmar",
    });
    expect(result.valid).toBe(false);
    expect(result.warnings).toEqual(["Pré-condição sem rastreabilidade suficiente na fonte."]);
    expect(result.traceability.preconditions).toEqual([false]);
    expect(result.traceability.steps).toEqual([true]);
  });

  it("não considera o sufixo de continuação ou fluxo como conteúdo inventado", () => {
    const result = validateScenarioAgainstSource("Título: Fluxo", {
      id: "delivery-1-scenario-2",
      title: "Fluxo — Fluxo principal (continuação 2)",
      reference: "Referência não informada nos artefatos.",
      preconditions: [],
      steps: [],
      expectedResult: [],
      gaps: [],
      gherkin: "",
      status: "a confirmar",
    });
    expect(result.valid).toBe(true);
    expect(result.traceability.functionality).toBe(true);
  });

  it("rastreia dados e gaps sem inventar correspondência", () => {
    const result = validateScenarioAgainstSource("Título: Pedido\nDados\nCPF informado.\nGaps e indefinições:\nMensagem não definida.", {
      id: "delivery-1-scenario-1",
      title: "Pedido",
      reference: "Referência não informada nos artefatos.",
      preconditions: [],
      data: ["CPF informado."],
      steps: [],
      expectedResult: [],
      gaps: ["Mensagem não definida.", "Resultado esperado não informado nos artefatos."],
      gherkin: "",
      status: "a confirmar",
    });
    expect(result.valid).toBe(true);
    expect(result.traceability.data).toEqual([true]);
    expect(result.traceability.gaps).toEqual([true, false]);
  });
});
