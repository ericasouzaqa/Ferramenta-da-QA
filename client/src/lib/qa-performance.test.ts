import { describe, expect, it } from "vitest";
import { analyzePerformance } from "./qa-performance";
import { buildExportBundle, formatExportExcel, formatExportMarkdown, formatExportText } from "./qa-export";
import type { OrganizedQaMaterial } from "./qa-organizer";

const material: OrganizedQaMaterial = {
  sourceLineCount: 3,
  requirements: [],
  deliveries: [{
    id: "delivery-1",
    title: "Pesquisa de clientes",
    sourceText: "Pesquisar clientes e exibir a tela.",
    requirement: {
      userStory: { asA: [], iWant: [], soThat: [] }, acceptanceCriteria: [], businessRules: [], technicalConstraints: [], flows: [], exceptions: [], technicalElements: [], gaps: ["Critério de filtro não informado."],
    },
    scenarios: [{
      id: "delivery-1-scenario-1", title: "Pesquisar clientes", preconditions: [], steps: ["Pesquisar clientes"], expectedResult: ["Exibir a tela"], gaps: [], gherkin: "", status: "pronto", reference: "não informada",
    }],
  }],
  scenarios: [],
};

describe("análise preventiva e exportação", () => {
  it("identifica risco de volume sem sugerir solução", () => {
    const result = analyzePerformance(material);
    expect(result.some((item) => item.title === "Volume e tempo de resposta")).toBe(true);
    expect(result.every((item) => !/implementar|usar cache|otimizar/i.test(JSON.stringify(item)))).toBe(true);
  });

  it("consolida os resultados nos três formatos", () => {
    const bundle = buildExportBundle(material, analyzePerformance(material));
    expect(formatExportMarkdown(bundle)).toContain("Validações de Performance");
    expect(formatExportText(bundle)).toContain("STEP 1");
    expect(formatExportExcel(bundle)).toContain("PERFORMANCE");
    expect(bundle.gaps).toContain("Critério de filtro não informado.");
  });
});
