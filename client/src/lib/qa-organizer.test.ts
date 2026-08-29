import { describe, expect, it } from "vitest";
import { formatScenario, organizeQaMaterial } from "./qa-organizer";

describe("organizeQaMaterial", () => {
  it("retorna nulo para uma fonte vazia", () => {
    expect(organizeQaMaterial(" \n \n ")).toBeNull();
  });

  it("preserva uma entrega sem inventar um cenário", () => {
    const source = "O botão Salvar não responde depois do preenchimento.\nA tela permanece aberta.";
    const result = organizeQaMaterial(source);
    expect(result?.deliveries).toHaveLength(1);
    expect(result?.deliveries[0].sourceText).toBe(source);
    expect(result?.deliveries[0].scenarios).toHaveLength(0);
    expect(result?.scenarios).toHaveLength(0);
  });

  it("organiza um STEP completo com referência e Gherkin", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Ativar campanha sem destinatários",
      "Item 1",
      "Pré-condições",
      "Possuir acesso à funcionalidade de criação de campanha.",
      "Possuir os dados necessários para preencher todos os campos obrigatórios.",
      "Passos",
      "Preencher uma nova campanha com todos os campos obrigatórios.",
      "Não anexar um arquivo XLSX com os destinatários.",
      "Clicar em ativar.",
      "Resultado esperado",
      "Bloquear a criação da campanha.",
      "Não concluir o cadastro da campanha sem que um arquivo XLSX seja informado.",
    ].join("\n"));
    const scenario = result?.scenarios[0];
    expect(result?.deliveries).toHaveLength(1);
    expect(scenario?.title).toBe("Ativar campanha sem destinatários");
    expect(scenario?.reference).toBe("Item 1");
    expect(scenario?.preconditions).toHaveLength(2);
    expect(scenario?.steps).toHaveLength(3);
    expect(scenario?.expectedResult).toHaveLength(2);
    expect(scenario?.gaps).toEqual([]);
    expect(scenario?.gherkin).toContain("Funcionalidade: Ativar campanha sem destinatários");
    expect(formatScenario(scenario!)).toContain("STEP 1");
  });

  it("separa entregas STEP e preserva referências Item e PBA", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Cadastro de campanha",
      "Item 1",
      "Pré-condições",
      "Possuir acesso ao cadastro.",
      "Passos",
      "Preencher os campos obrigatórios.",
      "Resultado esperado",
      "Exibir confirmação do cadastro.",
      "STEP 2",
      "Título: Ativação de campanha",
      "PBA 02",
      "Pré-condições",
      "Possuir uma campanha cadastrada.",
      "Passos",
      "Abrir a campanha.",
      "Clicar em ativar.",
      "Resultado esperado",
      "Ativar a campanha.",
    ].join("\n"));
    expect(result?.deliveries).toHaveLength(2);
    expect(result?.scenarios).toHaveLength(2);
    expect(result?.scenarios[0].reference).toBe("Item 1");
    expect(result?.scenarios[1].reference).toBe("PBA 02");
  });

  it("separa funcionalidades por referências explícitas repetidas mesmo sem STEP", () => {
    const result = organizeQaMaterial(["Título: Cadastro", "Item 1", "Passos", "Cadastrar.", "Resultado esperado", "Concluir.", "Título: Ativação", "PBI 2", "Passos", "Ativar.", "Resultado esperado", "Ativar."].join("\n"));
    expect(result?.deliveries).toHaveLength(2);
    expect(result?.deliveries[0].scenarios[0].reference).toBe("Item 1");
    expect(result?.deliveries[1].scenarios[0].reference).toBe("PBI 2");
  });

  it("divide uma funcionalidade com mais de oito passos em STEPs complementares", () => {
    const result = organizeQaMaterial(["STEP 1", "Título: Fluxo", "Passos", "1. Um", "2. Dois", "3. Três", "4. Quatro", "5. Cinco", "6. Seis", "7. Sete", "8. Oito", "9. Nove", "Resultado esperado", "Concluir."].join("\n"));
    expect(result?.scenarios).toHaveLength(2);
    expect(result?.scenarios[0].steps).toHaveLength(8);
    expect(result?.scenarios[1].steps).toEqual(["Nove"]);
    expect(result?.scenarios[1].title).toContain("continuação 2");
  });

  it("registra ausências e não usa frases de comportamento inventadas", () => {
    const result = organizeQaMaterial("STEP 1\nTítulo: Relato curto\nItem 4\nO botão não responde.");
    const scenario = result?.scenarios[0];
    expect(scenario?.status).toBe("a confirmar");
    expect(scenario?.gaps).toContain("Pré-condições não informadas nos artefatos.");
    expect(scenario?.gaps).toContain("Passos não informados nos artefatos.");
    expect(scenario?.gaps).toContain("Resultado esperado não informado nos artefatos.");
    expect(JSON.stringify(scenario)).not.toContain("A funcionalidade deve concluir");
    expect(scenario?.gherkin).toBe("");
  });

  it("reconhece PBI como referência explícita", () => {
    const result = organizeQaMaterial("STEP 1\nTítulo: Consulta\nPBI 42\nPassos\nConsultar.\nResultado esperado\nExibir resultado.");
    expect(result?.scenarios[0].reference).toBe("PBI 42");
  });

  it("mantém gaps explícitos da fonte", () => {
    const result = organizeQaMaterial(["STEP 1", "Título: Login", "Gaps e indefinições:", "Não foi informado o texto da mensagem."].join("\n"));
    expect(result?.scenarios[0].gaps).toContain("Não foi informado o texto da mensagem.");
  });

  it("reconhece uma entrega real com referência SC, ações numeradas e critérios de aceite", () => {
    const result = organizeQaMaterial([
      "⭐SC-4303 Task - Remover botões de Nova ação",
      "Descrição do incremento",
      "1. Remover o botão Envio de comando dentro de Nova ação.",
      "2. Manter a funcionalidade disponível no novo local.",
      "Critérios de aceite",
      "O botão Envio de comando não é exibido dentro de Nova ação.",
    ].join("\n"));
    const scenario = result?.scenarios[0];
    expect(scenario?.reference).toBe("SC-4303");
    expect(scenario?.steps).toHaveLength(2);
    expect(scenario?.expectedResult).toEqual(["O botão Envio de comando não é exibido dentro de Nova ação."]);
    expect(scenario?.status).toBe("a confirmar");
  });

  it("preserva texto exploratório sem critérios como entrega sem cenário", () => {
    const source = "Contexto\nPerguntas e respostas\nA documentação ainda será definida.";
    const result = organizeQaMaterial(source);
    expect(result?.deliveries[0].sourceText).toBe(source);
    expect(result?.scenarios).toEqual([]);
  });

  it("estrutura o requisito sem substituir a fonte original", () => {
    const source = [
      "STEP 1",
      "Título: Cadastro",
      "Como uma pessoa administradora",
      "Eu quero cadastrar um usuário",
      "Para que o acesso seja controlado",
      "Critérios de aceite",
      "Exibir o usuário cadastrado.",
      "Regras de negócio",
      "Permitir somente um cadastro por e-mail.",
      "Restrições técnicas",
      "Manter o formato do identificador.",
      "Fluxo principal",
      "Cadastrar os dados válidos.",
      "Exceções",
      "Bloquear dados inválidos.",
      "Elementos técnicos",
      "Campo e-mail.",
    ].join("\n");
    const result = organizeQaMaterial(source);
    const requirement = result?.requirements[0];
    expect(result?.deliveries[0].sourceText).toBe(source);
    expect(requirement?.userStory.asA).toEqual(["uma pessoa administradora"]);
    expect(requirement?.userStory.iWant).toEqual(["cadastrar um usuário"]);
    expect(requirement?.userStory.soThat).toEqual(["o acesso seja controlado"]);
    expect(requirement?.acceptanceCriteria).toEqual(["Exibir o usuário cadastrado."]);
    expect(requirement?.businessRules).toEqual(["Permitir somente um cadastro por e-mail."]);
    expect(requirement?.technicalConstraints).toEqual(["Manter o formato do identificador."]);
    expect(requirement?.flows).toEqual(["Cadastrar os dados válidos."]);
    expect(requirement?.exceptions).toEqual(["Bloquear dados inválidos."]);
    expect(requirement?.technicalElements).toEqual(["Campo e-mail."]);
    expect(requirement?.gaps).toEqual([]);
  });

  it("registra gaps da estrutura quando a fonte não informa história ou critérios", () => {
    const result = organizeQaMaterial("STEP 1\nTítulo: Consulta\nPassos\nConsultar.");
    expect(result?.requirements[0].gaps).toEqual([
      "História de usuário não informada nos artefatos.",
      "Critérios de aceitação não informados nos artefatos.",
    ]);
  });

  it("separa fluxo principal e exceção quando os cabeçalhos são explícitos", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Cadastro",
      "Pré-condições",
      "Possuir acesso.",
      "Fluxo principal",
      "Passos",
      "Informar dados válidos.",
      "Resultado esperado",
      "Exibir confirmação.",
      "Exceção",
      "Passos",
      "Informar dados inválidos.",
      "Resultado esperado",
      "Exibir erro.",
    ].join("\n"));
    expect(result?.scenarios).toHaveLength(2);
    expect(result?.scenarios[0].title).toBe("Cadastro — Fluxo principal");
    expect(result?.scenarios[0].steps).toEqual(["Informar dados válidos."]);
    expect(result?.scenarios[0].expectedResult).toEqual(["Exibir confirmação."]);
    expect(result?.scenarios[1].title).toBe("Cadastro — Exceção");
    expect(result?.scenarios[1].steps).toEqual(["Informar dados inválidos."]);
    expect(result?.scenarios[1].expectedResult).toEqual(["Exibir erro."]);
  });

  it("mantém ações agrupadas quando não há evidência de comportamentos distintos", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Cadastro",
      "Passos",
      "Informar dados.",
      "Salvar cadastro.",
      "Resultado esperado",
      "Exibir confirmação.",
    ].join("\n"));
    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].steps).toEqual(["Informar dados.", "Salvar cadastro."]);
  });
});
