import { describe, expect, it } from "vitest";
import { formatScenario, organizeQaMaterial } from "./qa-organizer";

describe("organizeQaMaterial", () => {
  it("retorna nulo para uma fonte vazia", () => {
    expect(organizeQaMaterial(" \n \n ")).toBeNull();
  });

  it("separa histórias explícitas e vincula cada STEP à história e à origem", () => {
    const result = organizeQaMaterial([
      "[Página 1]",
      "História: Cadastro de usuário",
      "Critérios de aceite",
      "Cadastrar usuário com dados válidos.",
      "Passos",
      "Preencher os dados documentados.",
      "Resultado esperado",
      "Usuário cadastrado.",
      "História: Consulta de usuário",
      "Critérios de aceite",
      "Consultar usuário existente.",
      "Passos",
      "Consultar o usuário.",
      "Resultado esperado",
      "Dados exibidos.",
    ].join("\n"));

    expect(result?.deliveries).toHaveLength(1);
    expect(result?.deliveries[0].stories).toHaveLength(2);
    expect(result?.deliveries[0].stories?.map((story) => story.title)).toEqual(["Cadastro de usuário", "Consulta de usuário"]);
    expect(result?.scenarios).toHaveLength(2);
    expect(result?.scenarios[0].storyTitle).toBe("Cadastro de usuário");
    expect(result?.scenarios[1].storyTitle).toBe("Consulta de usuário");
    expect(result?.scenarios[0].origin).toEqual(expect.objectContaining({ storyTitle: "Cadastro de usuário", page: 1 }));
    expect(result?.scenarios[1].origin).toEqual(expect.objectContaining({ storyTitle: "Consulta de usuário", page: 1 }));
    expect(result?.scenarios[0].steps).not.toContain("Consultar o usuário.");
    expect(result?.scenarios[1].steps).not.toContain("Preencher os dados documentados.");
  });

  it("formata o STEP somente com as seções exigidas e preserva pré-condições e dados", () => {
    const result = organizeQaMaterial([
      "História: Cadastro",
      "Pré-condições",
      "Usuário com acesso.",
      "Dados",
      "E-mail: qa@exemplo.com.",
      "Passos",
      "Preencher o nome.",
      "Resultado esperado",
      "Cadastro exibido.",
    ].join("\n"));
    const formatted = formatScenario(result!.scenarios[0]);
    expect(formatted).toContain("STEP 1\n");
    expect(formatted).toContain("Pré-condições\n\n- Usuário com acesso.\n\nDados de teste\n\n- E-mail: qa@exemplo.com.");
    expect(formatted).toContain("Passos\n\n1. Preencher o nome.");
    expect(formatted).toContain("Resultado esperado\n\n- Cadastro exibido.");
    expect(formatted).not.toContain("História/Requisito");
    expect(formatted).not.toContain("Gherkin");
    expect(formatted).not.toContain("Origem:");
    expect(formatted).not.toContain("Referência:");
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

  it("mantém um único caso de teste quando os passos pertencem ao mesmo objetivo", () => {
    const result = organizeQaMaterial(["STEP 1", "Título: Fluxo", "Passos", "1. Um", "2. Dois", "3. Três", "4. Quatro", "5. Cinco", "6. Seis", "7. Sete", "8. Oito", "9. Nove", "Resultado esperado", "Concluir."].join("\n"));
    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].steps).toHaveLength(9);
    expect(result?.scenarios[0].title).toBe("Fluxo");
    expect(result?.scenarios[0].title).not.toContain("continuação");
  });

  it("preserva uma tabela da funcionalidade no STEP sem descartar linhas", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Consulta de pedidos",
      "Dados",
      "| Campo | Valor |",
      "| Status | Pendente |",
      "Passos",
      "Consultar pedidos.",
      "Resultado esperado",
      "Exibir o pedido com status Pendente.",
    ].join("\n"));
    const scenario = result!.scenarios[0];
    expect(scenario.data).toEqual(["| Campo | Valor |", "| Status | Pendente |"]);
    expect(formatScenario(scenario)).toContain("Dados de teste\n\n- | Campo | Valor |\n- | Status | Pendente |");
    expect(scenario.steps).toEqual(["Consultar pedidos."]);
    expect(scenario.expectedResult).toEqual(["Exibir o pedido com status Pendente."]);
  });

  it("preserva um fluxo extenso sem transformar quantidade de linhas em quantidade de casos", () => {
    const source = [
      "STEP 1",
      "Título: Fluxo extenso",
      "Passos",
      ...Array.from({ length: 11 }, (_, index) => `${index + 1}. Executar ação ${index + 1}.`),
      "Resultado esperado",
      "Concluir o fluxo.",
    ].join("\n");
    const result = organizeQaMaterial(source);
    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].steps).toHaveLength(11);
    expect(result?.scenarios[0].expectedResult).toEqual(["Concluir o fluxo."]);
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

  it("deriva a história do título narrativo e registra apenas critérios realmente ausentes", () => {
    const result = organizeQaMaterial("STEP 1\nTítulo: Consulta\nPassos\nConsultar.");
    expect(result?.requirements[0].userStory.iWant).toEqual(["consulta"]);
    expect(result?.requirements[0].gaps).toEqual([
      "Critérios de aceitação não informados no conteúdo fornecido.",
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

  it("classifica um STEP completo quando há funcionalidade, passos, resultado e origem", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Login",
      "Passos",
      "Informar usuário.",
      "Resultado esperado",
      "Exibir acesso.",
    ].join("\n"));
    expect(result?.scenarios[0].quality).toBe("completo");
    expect(result?.scenarios[0].gapDetails).toEqual([
      { text: "Pré-condições não informadas nos artefatos.", category: "dados" },
    ]);
  });

  it("classifica um STEP incompleto como parcial e categoriza os GAPS", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Login",
      "Passos",
      "Informar usuário.",
    ].join("\n"));
    expect(result?.scenarios[0].quality).toBe("parcial");
    expect(result?.scenarios[0].gapDetails).toEqual([
      { text: "Pré-condições não informadas nos artefatos.", category: "dados" },
      { text: "Resultado esperado não informado nos artefatos.", category: "funcional" },
    ]);
  });

  it("classifica conflito explícito como inconsistente sem bloquear a geração", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Login",
      "Passos",
      "Informar usuário.",
      "Resultado esperado",
      "Exibir acesso.",
      "Gaps e indefinições:",
      "Conflito entre regras de negócio.",
    ].join("\n"));
    expect(result?.scenarios[0].quality).toBe("inconsistente");
    expect(result?.scenarios[0].status).toBe("a confirmar");
    expect(result?.scenarios[0].gapDetails).toContainEqual({
      text: "Conflito entre regras de negócio.",
      category: "funcional",
    });
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


describe("organização de narrativa em História de Usuário", () => {
  it("reconhece o título e deriva a estrutura do requisito SC-3786 somente da fonte", () => {
    const source = [
      "⭐SC-3786 PBI01 - Enviar um comando para um equipamento",
      "Descrição",
      "Inserir o botão \"Comandos\" dentro da seção \"Dispositivos\";",
      "O botão abre a janela lateral \"Comandos\";",
      "Dentro da janela há a seção \"Enviar novo comando\"",
      "Ao determinar um dispositivo, tipo de comando e timeout, o botão Enviar fica habilitado;",
      "Dispositivo: dropdown de seleção única com a relação de seriais de dispositivos vinculados ao objeto rastreável.",
      "Tipo de comando: dropdown de seleção única com opções de comandos disponíveis para o dispositivo.",
      "HABILITAR MODO EMERGENCIA - 108",
      "DESABILITAR MODO EMERGENCIA - 74",
      "LORAWAN ATIVAR MODO EMERGENCIA - 138",
      "LORAWAN DESATIVAR MODO EMERGENCIA - 139",
      "ATIVAR OUTPUT1 - 7",
      "DESATIVAR OUTPUT1 - 9",
      "ATIVAR OUTPUT2 - 8",
      "DESATIVAR OUTPUT2 - 10",
      "SOLICITAR POSIÇÃO - 69",
      "RESETAR MÓDULO - ?",
      "Ponto de atenção: novos comandos precisam ser incluídos nessa tabela de forma fácil e rápida.",
      "Após enviar, o sistema:",
      "Envia para o worker o comando;",
      "Salva no banco o comando, além do usuário que o enviou e data/hora;",
      "Obs: não será possível o envio para iscas ou comandos de sms nessa entrega, o entregável é testável para ocorrências da base, com objeto rastreável ativo e acatando comandos simples enviados via Mogno.",
      "Mostra uma snackbar de sucesso no envio.",
      "Obs: na ausência de documentação técnica referente a configuração de timeout e envio de parâmetro, esse pedaço será executado apenas no PBI04",
      "Critérios de aceite",
      "É possível enviar cada um dos comandos listados",
    ].join("\n");

    const result = organizeQaMaterial(source);
    const delivery = result?.deliveries[0];
    const requirement = delivery?.requirement;

    expect(delivery?.title).toBe("SC-3786 PBI01 - Enviar um comando para um equipamento");
    expect(delivery?.stories?.[0].title).toBe("SC-3786 PBI01 - Enviar um comando para um equipamento");
    expect(requirement?.userStory.asA.join(" ")).toMatch(/usuário|operador/i);
    expect(requirement?.userStory.iWant.join(" ")).toMatch(/enviar um comando para um equipamento/i);
    expect(requirement?.userStory.soThat.length).toBeGreaterThan(0);
    expect(requirement?.acceptanceCriteria).toContain("É possível enviar cada um dos comandos listados");
    expect(requirement?.businessRules.join(" ")).toMatch(/dispositivo|comando|Enviar/i);
    expect(requirement?.technicalConstraints.join(" ")).toMatch(/iscas|sms|PBI04/i);
    expect(requirement?.technicalElements.join(" ")).toMatch(/worker|banco|snackbar/i);
    expect(requirement?.gaps.join(" ")).toMatch(/RESETAR MÓDULO|timeout|parâmetro/i);
    expect(requirement?.gaps).not.toContain("História de usuário não informada nos artefatos.");
    expect(result?.scenarios).toHaveLength(4);
    const [access, device, command, submit] = result!.scenarios;

    expect(access.preconditions).toEqual([
      "Possuir uma ocorrência da base com objeto rastreável ativo.",
      "Possuir dispositivo vinculado ao objeto rastreável.",
      "Acessar a seção \"Dispositivos\".",
    ]);
    expect(access.steps).toEqual([
      "Identificar o botão \"Comandos\" dentro da seção \"Dispositivos\".",
      "Acionar o botão \"Comandos\".",
    ]);
    expect(access.expectedResult).toEqual([
      "Abrir a janela lateral \"Comandos\".",
      "Exibir a seção \"Enviar novo comando\".",
    ]);

    expect(device.steps).toEqual([
      "Acionar o dropdown \"Dispositivo\".",
      "Consultar as opções disponíveis.",
      "Selecionar um dispositivo.",
    ]);
    expect(device.expectedResult.join(" ")).toMatch(/seriais.+vinculados|seleção de apenas um dispositivo/i);

    expect(command.steps).toEqual([
      "Acionar o dropdown \"Tipo de comando\".",
      "Consultar as opções disponíveis.",
      "Selecionar cada comando listado, individualmente.",
    ]);
    expect(command.data).toHaveLength(10);
    expect(command.expectedResult.join(" ")).toMatch(/HABILITAR MODO EMERGENCIA.+108.+RESETAR MÓDULO.+apenas um tipo de comando/i);

    expect(submit.steps).toEqual([
      "Informar o timeout.",
      "Verificar o estado do botão \"Enviar\".",
      "Acionar o botão \"Enviar\".",
    ]);
    expect(submit.expectedResult.join(" ")).toMatch(/Habilitar o botão.+worker.+banco.+snackbar/i);
    expect(result?.scenarios.every((scenario) => !scenario.title.includes("continuação"))).toBe(true);
    expect(requirement?.gaps).toEqual(expect.arrayContaining([
      expect.stringMatching(/ID.+RESETAR MÓDULO/i),
      expect.stringMatching(/valores permitidos.+timeout/i),
      expect.stringMatching(/PBI04/i),
      expect.stringMatching(/texto da snackbar/i),
      expect.stringMatching(/validar o envio.+worker/i),
      expect.stringMatching(/estrutura.+gravação.+banco/i),
    ]));
  });
});
