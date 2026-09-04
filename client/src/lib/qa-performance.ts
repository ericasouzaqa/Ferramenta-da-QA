import type { GeneratedScenario, OrganizedQaMaterial } from "./qa-organizer";

export type PerformanceValidation = {
  title: string;
  objective: string;
  risk: string;
  howToTest: string;
  recommendedTool: string;
  expectedResult: string;
  rationale: string;
};

const RISK_RULES: Array<{ pattern: RegExp; title: string; risk: string; test: string; tool: string; expected: string; rationale: string }> = [
  { pattern: /(?:buscar|consultar|pesquisar|listar|filtrar|carregar|importar|sincronizar|atualizar)/i, title: "Volume e tempo de resposta", risk: "A operação pode degradar com aumento de registros ou requisições.", test: "Executar o STEP com volume pequeno, médio e alto, medindo o tempo de resposta.", tool: "DevTools do navegador ou ferramenta de teste de carga", expected: "O tempo de resposta permanece aceitável e a operação conclui sem falhas observáveis.", rationale: "O requisito descreve acesso ou processamento de dados, mas não delimita volume nem comportamento sob carga." },
  { pattern: /(?:digita|preenche|campo|filtro)/i, title: "Processamento durante entrada de dados", risk: "A aplicação pode executar processamento repetido a cada alteração do campo.", test: "Digitar uma sequência longa e observar quantidade de chamadas, travamentos e tempo de resposta.", tool: "DevTools do navegador", expected: "A digitação permanece fluida e não há chamadas ou atualizações excessivas observáveis.", rationale: "Campos e filtros alterados durante a interação podem gerar custo repetido de processamento." },
  { pattern: /(?:tela|página|abrir|exibir|mostrar|carregar)/i, title: "Carregamento e experiência de uso", risk: "O carregamento pode ser excessivo ou antecipado e prejudicar a experiência.", test: "Abrir a tela em conexão limitada e observar o carregamento inicial e a interação.", tool: "DevTools do navegador, painel Network", expected: "A tela permite interação no tempo esperado sem carregamentos desnecessários observáveis.", rationale: "O requisito envolve apresentação de tela, mas não informa limites de carregamento." },
  { pattern: /(?:enviar|salvar|processar|gerar|validar)/i, title: "Timeout e repetição de operação", risk: "A operação pode exceder o tempo esperado ou ser disparada repetidamente.", test: "Executar a operação com resposta lenta e observar timeout, duplicidade e feedback ao usuário.", tool: "DevTools do navegador ou teste de integração", expected: "A operação tem comportamento observável e previsível sob resposta lenta, sem duplicidade.", rationale: "Operações de processamento ou persistência podem sofrer com latência e repetição." },
];

function sourceText(material: OrganizedQaMaterial, scenario: GeneratedScenario) {
  const delivery = material.deliveries.find((item) => item.scenarios.some((candidate) => candidate.id === scenario.id));
  return [delivery?.sourceText, scenario.title, ...scenario.steps, ...scenario.expectedResult].filter(Boolean).join(" ");
}

export function analyzePerformance(material: OrganizedQaMaterial): PerformanceValidation[] {
  const scenarios = material.deliveries.flatMap((delivery) => delivery.scenarios);
  const validations: PerformanceValidation[] = [];
  scenarios.forEach((scenario) => {
    const text = sourceText(material, scenario);
    RISK_RULES.forEach((rule) => {
      if (!rule.pattern.test(text)) return;
      const key = `${rule.title}:${scenario.title}`;
      if (validations.some((item) => `${item.title}:${item.objective}` === key)) return;
      validations.push({
        title: rule.title,
        objective: `Validar performance do STEP: ${scenario.title}`,
        risk: rule.risk,
        howToTest: rule.test,
        recommendedTool: rule.tool,
        expectedResult: rule.expected,
        rationale: rule.rationale,
      });
    });
  });
  return validations;
}
