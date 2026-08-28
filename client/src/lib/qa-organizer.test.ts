import { describe, expect, it } from "vitest";
import { organizeQaMaterial } from "./qa-organizer";

describe("organizeQaMaterial", () => {
  it("gera a estrutura obrigatória sem acrescentar fatos à fonte", () => {
    const source = [
      "Título: Erro ao salvar solicitação",
      "Comportamento observado: ao enviar o formulário, a tela exibe erro 500.",
      "Comportamento esperado: o sistema deve registrar a solicitação e exibir confirmação.",
      "1. Acessar o formulário.",
      "2. Preencher os campos obrigatórios.",
      "3. Enviar a solicitação.",
    ].join("\n");

    const result = organizeQaMaterial(source);
    const card = result?.cards[0];

    expect(card?.title).toBe("Erro ao salvar solicitação");
    expect(card?.sections.map((section) => section.title)).toEqual(["Descrição", "Itens de correção", "Critérios de aceite", "Cenários de teste"]);
    expect(card?.cardText).toContain("a tela exibe erro 500.");
    expect(card?.cardText).toContain("o sistema deve registrar a solicitação e exibir confirmação.");
    expect(card?.cardText).not.toContain("navegador");
  });

  it("separa um card para cada problema explicitamente identificado", () => {
    const source = [
      "Título: Falha ao salvar perfil",
      "Comportamento observado: o perfil não é salvo.",
      "Comportamento esperado: o perfil deve ser salvo.",
      "Título: Mensagem duplicada",
      "Comportamento observado: a mensagem aparece duas vezes.",
      "Comportamento esperado: a mensagem deve aparecer uma vez.",
    ].join("\n");

    const result = organizeQaMaterial(source);

    expect(result?.cards).toHaveLength(2);
    expect(result?.cards[0].title).toBe("Falha ao salvar perfil");
    expect(result?.cards[1].title).toBe("Mensagem duplicada");
  });

  it("gera apenas critérios quando esse escopo é solicitado", () => {
    const result = organizeQaMaterial("Comportamento esperado: o registro deve ser salvo.", "criterios");

    expect(result?.cards[0].sections).toHaveLength(1);
    expect(result?.cards[0].sections[0].id).toBe("acceptance");
    expect(result?.cards[0].sections[0].content).toEqual(["o registro deve ser salvo."]);
  });

  it("gera um STEP com gaps explícitos para uma fonte sem estrutura completa", () => {
    const result = organizeQaMaterial("Ocorre falha ao tentar enviar o formulário.", "cenarios");
    const tests = result?.cards[0].sections[0];

    expect(tests?.id).toBe("tests");
    expect(tests?.content[0]).toContain("STEP 1");
    expect(tests?.content[0]).toContain("Gaps e indefinições:");
    expect(tests?.content[0]).not.toContain("[ ]");
    expect(result?.scenarios[0].status).toBe("a confirmar");
  });

  it("transforma um relato curto de três linhas em um card completo sem criar regra de negócio", () => {
    const source = [
      "O botão Salvar não responde depois do preenchimento.",
      "A tela permanece aberta e o cadastro não é concluído.",
      "A pessoa usuária não consegue finalizar a solicitação.",
    ].join("\n");

    const card = organizeQaMaterial(source)?.cards[0];

    expect(card?.sections.map((section) => section.title)).toEqual(["Descrição", "Itens de correção", "Critérios de aceite", "Cenários de teste"]);
    expect(card?.sections[0].content.join(" ")).toContain("O botão Salvar não responde");
    expect(card?.sections[1].content).toEqual(["Corrigir o comportamento descrito para eliminar a falha relatada."]);
    expect(card?.sections[2].content).toEqual(["A funcionalidade deve concluir a ação informada sem apresentar a falha descrita."]);
    expect(card?.sections[3].content.every((scenario) => scenario.startsWith("STEP 1"))).toBe(true);
    expect(card?.cardText).not.toMatch(/Introdução|Conclusão|emoji/i);
  });

  it("inclui somente cenários aplicáveis e mantém problemas explícitos em cards separados", () => {
    const source = [
      "Problema: Campo de placa aceita formato inválido",
      "O campo permite salvar uma placa incompleta.",
      "Problema: Botão de consulta fica desabilitado",
      "O botão não permite iniciar a consulta após preencher a placa.",
    ].join("\n");

    const result = organizeQaMaterial(source);

    expect(result?.cards).toHaveLength(2);
    expect(result?.cards[0].scenarios).toHaveLength(1);
    expect(result?.cards[1].scenarios).toHaveLength(1);
    expect(result?.cards[0].scenarios[0].title).toBe("Campo de placa aceita formato inválido");
    expect(result?.cards[1].scenarios[0].title).toBe("Botão de consulta fica desabilitado");
    expect(result?.cards.flatMap((card) => card.sections.map((section) => section.title))).not.toContain("Revisão de lacunas");
  });

  it("separa dois problemas curtos por parágrafo mesmo sem rótulos formais", () => {
    const result = organizeQaMaterial([
      "O botão Salvar não responde depois do preenchimento.",
      "O cadastro não é concluído.",
      "",
      "A consulta apresenta mensagem duplicada.",
      "A pessoa usuária não sabe se a consulta foi realizada.",
    ].join("\n"));

    expect(result?.cards).toHaveLength(2);
    expect(result?.cards[0].sections[0].content.join(" ")).toContain("botão Salvar");
    expect(result?.cards[1].sections[0].content.join(" ")).toContain("mensagem duplicada");
  });

  it("inclui impacto somente quando o efeito é descrito no problema", () => {
    const result = organizeQaMaterial("A consulta não é concluída e impede a pessoa usuária de finalizar o atendimento.");

    expect(result?.scenarios).toHaveLength(1);
    expect(result?.scenarios[0].kind).toBe("impacto");
    expect(result?.scenarios[0].gaps).toContain("Pré-condições não informadas nos artefatos.");
  });

  it("preserva a estrutura STEP informada e mantém Gherkin quando há dados completos", () => {
    const result = organizeQaMaterial([
      "Título: Ativar campanha sem destinatários",
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
      "Gaps e indefinições:",
      "Não foi informado o texto da mensagem de validação apresentada ao usuário.",
    ].join("\n"), "cenarios");
    const scenario = result?.scenarios[0];

    expect(scenario?.title).toBe("Ativar campanha sem destinatários");
    expect(scenario?.steps).toHaveLength(3);
    expect(scenario?.preconditions).toHaveLength(2);
    expect(scenario?.expectedResult).toHaveLength(2);
    expect(scenario?.gaps).toContain("Não foi informado o texto da mensagem de validação apresentada ao usuário.");
    expect(scenario?.gherkin).toContain("Funcionalidade: Ativar campanha sem destinatários");
    expect(result?.cards[0].sections[0].content[0]).toContain("STEP 1");
  });

  it("separa uma entrega em partes STEP e preserva referências explícitas", () => {
    const result = organizeQaMaterial([
      "STEP 1",
      "Título: Cadastro de campanha",
      "Item 1",
      "Pré-condições",
      "Possuir acesso ao cadastro.",
      "Passos",
      "Preencher os campos obrigatórios.",
      "Clicar em salvar.",
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

    expect(result?.cards).toHaveLength(2);
    expect(result?.scenarios).toHaveLength(2);
    expect(result?.scenarios[0].reference).toBe("Item 1");
    expect(result?.scenarios[1].reference).toBe("PBA 02");
    expect(result?.scenarios.every((scenario) => scenario.steps.length <= 8)).toBe(true);
  });

  it("não gera resultado para uma fonte vazia", () => {
    expect(organizeQaMaterial(" \n \n ")).toBeNull();
  });
});
