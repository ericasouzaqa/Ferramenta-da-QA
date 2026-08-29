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
    expect(result).toEqual({ warnings: [], valid: true });
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
    expect(result.warnings).toEqual(["Pré-condição sem correspondência literal na fonte."]);
  });

  it("não considera o sufixo de continuação como conteúdo inventado", () => {
    const result = validateScenarioAgainstSource("Título: Fluxo", {
      id: "delivery-1-scenario-2",
      title: "Fluxo (continuação 2)",
      reference: "Referência não informada nos artefatos.",
      preconditions: [],
      steps: [],
      expectedResult: [],
      gaps: [],
      gherkin: "",
      status: "a confirmar",
    });
    expect(result.valid).toBe(true);
  });
});
