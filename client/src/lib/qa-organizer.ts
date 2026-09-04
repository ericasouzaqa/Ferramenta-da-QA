import { validateScenarioAgainstSource } from "./qa-validation";

export type GapCategory = "funcional" | "critério" | "dados" | "fluxo" | "técnico";

export type ClassifiedGap = {
  text: string;
  category: GapCategory;
};

export type StepQuality = "completo" | "parcial" | "inconsistente";

export type StepOrigin = {
  storyTitle: string;
  page?: number;
  excerpt: string;
};

export type UserStoryRequirement = {
  id: string;
  title: string;
  sourceText: string;
  requirement: RequirementStructure;
  scenarioIds: string[];
};

export type GeneratedScenario = {
  id: string;
  title: string;
  preconditions: string[];
  data?: string[];
  steps: string[];
  expectedResult: string[];
  gaps: string[];
  gapDetails?: ClassifiedGap[];
  traceability?: {
    functionality: boolean;
    preconditions: boolean[];
    steps: boolean[];
    expectedResult: boolean[];
    data: boolean[];
    gaps: boolean[];
  };
  quality?: StepQuality;
  sourceMode?: "explicit" | "narrative";
  storyTitle?: string;
  origin?: StepOrigin;
  gherkin: string;
  status: "pronto" | "a confirmar";
  reference: string;
};

export type Delivery = {
  id: string;
  title: string;
  sourceText: string;
  scenarios: GeneratedScenario[];
  requirement: RequirementStructure;
  stories?: UserStoryRequirement[];
};

export type RequirementStructure = {
  userStory: {
    asA: string[];
    iWant: string[];
    soThat: string[];
  };
  acceptanceCriteria: string[];
  businessRules: string[];
  technicalConstraints: string[];
  flows: string[];
  exceptions: string[];
  data?: string[];
  technicalElements: string[];
  dependencies: string[];
  attentionPoints: string[];
  gaps: string[];
  gapDetails?: ClassifiedGap[];
};

export type OrganizedQaMaterial = {
  deliveries: Delivery[];
  scenarios: GeneratedScenario[];
  sourceLineCount: number;
  requirements: RequirementStructure[];
};

const NOT_INFORMED = "Não informado no conteúdo de origem.";
const STEP_MARKER = /^STEP(?:\s+(\d+))?\s*$/i;
const SECTION_HEADERS = {
  preconditions: /^pré[- ]condições?\s*:??$/i,
  steps: /^passos?\s*:??$/i,
  expected: /^(?:resultado|resultados)\s+esperado(?:s)?\s*:??$/i,
  acceptance: /^critérios?\s+de\s+aceite\s*:??$/i,
  gaps: /^gaps?\s+e\s+indefinições\s*:??$/i,
};
const TITLE_HEADER = /^(?:título|titulo)\s*:\s*(.*)$/i;
const STORY_TITLE_HEADER = /^(?:história|historia|user story|rf|requisito|pbi|entrega)\s*(?:[#:.\-]\s*)?(.+)$/i;
const USER_STORY_HEADERS = {
  asA: /^(?:como|como um|como uma)\s*:?\s*(.*)$/i,
  iWant: /^(?:eu quero|quero)\s*:?\s*(.*)$/i,
  soThat: /^(?:para que|a fim de)\s*:?\s*(.*)$/i,
};
const STRUCTURE_HEADERS = {
  businessRules: /^(?:regras?|regras? de negócio|regra de negócio)\s*:??$/i,
  technicalConstraints: /^(?:restrições?|restrições? técnicas?|limitações?)\s*:??$/i,
  flows: /^(?:fluxos?|fluxo principal|fluxo alternativo)\s*:??$/i,
  exceptions: /^(?:exceções?|excepções?)\s*:??$/i,
  technicalElements: /^(?:elementos?|detalhes?) técnicos?\s*:??$/i,
  data: /^(?:dados?|dados necessários?)\s*:??$/i,
};
const ALL_STRUCTURE_HEADERS = [...Object.values(SECTION_HEADERS), ...Object.values(STRUCTURE_HEADERS)];

function classifyGap(text: string): GapCategory {
  if (/critério|aceite/i.test(text)) return "critério";
  if (/pré-condiç|dados?|campo|valor/i.test(text)) return "dados";
  if (/fluxo|exceção|caminho/i.test(text)) return "fluxo";
  if (/técnic|rastreab|correspondência literal|origem/i.test(text)) return "técnico";
  return "funcional";
}

function classifyGaps(gaps: string[]): ClassifiedGap[] {
  return gaps.map((text) => ({ text, category: classifyGap(text) }));
}

function qualityFor(gaps: string[], inconsistent = false): StepQuality {
  if (inconsistent) return "inconsistente";
  const materialGaps = gaps.filter((gap) => !/^Pré-condições não informadas nos artefatos\.$/i.test(gap));
  return materialGaps.length ? "parcial" : "completo";
}
const DELIVERY_HEADER = /^(?:[⭐*•]\s*)?(?:(?:SC[- ]\d+)|(?:PBI\s*\d+)|(?:PBA\s*\d+)|(?:Item\s*[A-Za-z0-9._/-]+))\b.*$/i;
const REFERENCE = /\b(?:(?:SC[- ]\d+)|(?:item|pbi|pba|card)\s*(?:[#:]|-)?\s*(?=[A-Za-z0-9._/-]*\d)[A-Za-z0-9][A-Za-z0-9._/-]*)(?![A-Za-z0-9])/i;
const REFERENCE_LINE = /^(?:(?:SC[- ]\d+)|(?:item|pbi|pba|card)\s*(?:[#:]|-)?\s*(?=[A-Za-z0-9._/-]*\d)[A-Za-z0-9][A-Za-z0-9._/-]*)(?![A-Za-z0-9])$/i;

function cleanLine(line: string) {
  return line
    .trim()
    .replace(/^\*{0,2}[⭐*•▪●]+\*{0,2}\s*/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function splitLines(source: string) {
  return source.replaceAll("\r", "").split("\n");
}

function splitExplicitStories(lines: string[]) {
  const starts = lines
    .map((line, index) => ({ line: cleanLine(line), index }))
    .filter(({ line }) => STORY_TITLE_HEADER.test(line) && !TITLE_HEADER.test(line) && !REFERENCE_LINE.test(line));
  if (starts.length < 2) return [];
  return starts.map(({ index }, storyIndex) => lines.slice(index, starts[storyIndex + 1]?.index ?? lines.length));
}

function sourcePage(lines: string[]) {
  const page = lines.map(cleanLine).map((line) => line.match(/^\[Página\s+(\d+)\]/i)?.[1]).find(Boolean);
  return page ? Number(page) : undefined;
}

function sourceExcerpt(lines: string[]) {
  return lines.map(cleanLine).filter(Boolean).join(" ").slice(0, 240);
}

function splitDeliveries(lines: string[]) {
  const groups: string[][] = [];
  let current: string[] = [];
  for (const line of lines) {
    const value = cleanLine(line);
    const startsNewStep = STEP_MARKER.test(value) && current.some((item) => cleanLine(item));
    const startsNewTitle = TITLE_HEADER.test(value) && current.some((item) => TITLE_HEADER.test(cleanLine(item)));
    const startsNewReference = REFERENCE_LINE.test(value) && current.some((item) => REFERENCE_LINE.test(cleanLine(item)));
    const startsNewDeliveryHeader = DELIVERY_HEADER.test(value) && !REFERENCE_LINE.test(value) && current.some((item) => cleanLine(item));
    if (startsNewStep || startsNewTitle || startsNewReference || startsNewDeliveryHeader) {
      groups.push(current);
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.some((item) => cleanLine(item))) groups.push(current);
  return groups;
}

function findTitle(lines: string[]) {
  const cleaned = lines.map(cleanLine);
  const explicit = cleaned.map((line) => line.match(TITLE_HEADER)?.[1]?.trim()).find(Boolean);
  if (explicit) return explicit;
  const storyTitle = cleaned.map((line) => line.match(STORY_TITLE_HEADER)?.[1]?.trim()).filter((value): value is string => Boolean(value)).find((value) => !/^principal$|^alternativo$|^e\s+/.test(value));
  if (storyTitle) return storyTitle;
  return cleaned.find((line) => DELIVERY_HEADER.test(line) && !REFERENCE_LINE.test(line)) || "Título não informado";
}

function findReference(lines: string[]) {
  for (const line of lines.map(cleanLine)) {
    const match = line.match(REFERENCE);
    if (match) return match[0];
  }
  return "Referência não informada nos artefatos.";
}

function extractSection(lines: string[], header: RegExp) {
  const start = lines.findIndex((line) => header.test(cleanLine(line)));
  if (start < 0) return [];
  const values: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = cleanLine(lines[index]);
    if (ALL_STRUCTURE_HEADERS.some((candidate) => candidate.test(line))) break;
    if (line) values.push(line);
  }
  return values;
}

const GENERIC_LINE = /^(?:descrição|image\d*\.(?:png|jpe?g|webp)|comando\s+parâmetros?\s+id)$/i;
const NARRATIVE_RULE = /(?:dropdown|seleção única|fica habilitado|vinculad[oa]s?|opções? disponíveis?|deve|precisa|é possível|ao determinar|quando)/i;
const NARRATIVE_CONSTRAINT = /(?:não será possível|não será permitido|somente|apenas|fora desta entrega|nessa entrega|nesta entrega|PBI\d+|ausência de documentação)/i;
const NARRATIVE_DEPENDENCY = /(?:depende|dependência|vinculad[oa]|worker|banco|objeto rastreável|documentação técnica)/i;
const NARRATIVE_TECHNICAL = /(?:worker|banco|snackbar|dropdown|timeout|parâmetro|data\/hora|ID\b)/i;
const NARRATIVE_ATTENTION = /^(?:ponto de atenção|atenção|observação importante)\s*:\s*(.+)$/i;

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function lowerFirst(value: string) {
  return value ? `${value[0].toLocaleLowerCase("pt-BR")}${value.slice(1)}` : value;
}

function narrativeContent(lines: string[]) {
  return lines.map(cleanLine).filter((line) => line
    && !GENERIC_LINE.test(line)
    && !DELIVERY_HEADER.test(line)
    && !TITLE_HEADER.test(line)
    && !ALL_STRUCTURE_HEADERS.some((header) => header.test(line)));
}

function titleGoal(title: string) {
  if (title === "Título não informado") return "";
  const afterSeparator = title.split(/\s+[-–—]\s+/).slice(1).join(" - ").trim();
  return afterSeparator || title.replace(/^(?:(?:SC[- ]?\d+)|(?:PBI\s*\d+)|(?:Item\s*[A-Za-z0-9._/-]+))\s*/i, "").trim();
}

function inferUserStory(lines: string[], acceptanceCriteria: string[]) {
  const cleaned = narrativeContent(lines);
  const explicit = (header: RegExp) => cleaned
    .map((line) => line.match(header)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
  const explicitAsA = explicit(USER_STORY_HEADERS.asA);
  const explicitIWant = explicit(USER_STORY_HEADERS.iWant);
  const explicitSoThat = explicit(USER_STORY_HEADERS.soThat);
  const goal = titleGoal(findTitle(lines)) || cleaned.find((line) => EXPLICIT_ACTION.test(line)) || "";
  if (explicitAsA.length || explicitIWant.length || explicitSoThat.length) {
    return { asA: explicitAsA, iWant: explicitIWant, soThat: explicitSoThat };
  }
  if (!goal) return { asA: [], iWant: [], soThat: [] };
  const actorMatch = cleaned.join(" ").match(/\b(?:usuário|usuária|operador|operadora|analista|administrador|administradora|cliente|pessoa)\b/i)?.[0];
  const outcome = acceptanceCriteria[0]
    || cleaned.find((line) => /^(?:após|o sistema|mostra|exibe|salva|envia|permite)\b/i.test(line) && line !== goal);
  const purpose = outcome
    ? (/^é possível\s+/i.test(outcome) ? outcome.replace(/^é possível\s+/i, "seja possível ") : `o sistema ${lowerFirst(outcome).replace(/^o sistema\s+/i, "")}`)
    : `seja possível concluir ${lowerFirst(goal)}`;
  return {
    asA: [actorMatch ? lowerFirst(actorMatch) : "pessoa usuária da funcionalidade"],
    iWant: [lowerFirst(goal)],
    soThat: [purpose.replace(/[.;]+$/, "")],
  };
}

function inferNarrativeStructure(lines: string[]) {
  const cleaned = narrativeContent(lines);
  const attentionPoints = uniqueValues(cleaned.map((line) => line.match(NARRATIVE_ATTENTION)?.[1] ?? ""));
  const technicalConstraints = uniqueValues(cleaned.filter((line) => NARRATIVE_CONSTRAINT.test(line)));
  const businessRules = uniqueValues(cleaned.filter((line) => NARRATIVE_RULE.test(line)
    && !NARRATIVE_CONSTRAINT.test(line)
    && !NARRATIVE_ATTENTION.test(line)
    && !/^É possível\b/i.test(line)));
  const dependencies = uniqueValues(cleaned.filter((line) => NARRATIVE_DEPENDENCY.test(line)));
  const technicalElements = uniqueValues(cleaned.filter((line) => NARRATIVE_TECHNICAL.test(line)));
  const gaps: string[] = [];
  commandRows(lines).filter((command) => command.id === "?").forEach((command) => {
    gaps.push(`O ID do comando "${command.name}" está definido como "?".`);
  });
  if (cleaned.some((line) => /timeout/i.test(line))) {
    gaps.push("Não foram informados os valores permitidos, formato, unidade ou comportamento do campo de timeout.");
  }
  if (cleaned.some((line) => /(?:timeout|parâmetro).+PBI\s*0*4|PBI\s*0*4.+(?:timeout|parâmetro)/i.test(line))) {
    gaps.push("A configuração de timeout e o envio de parâmetros foram explicitamente direcionados para o PBI04 e não estão detalhados neste requisito.");
  }
  if (cleaned.some((line) => /snackbar de sucesso/i.test(line)) && !cleaned.some((line) => /texto da snackbar|mensagem.+snackbar/i.test(line))) {
    gaps.push("Não foi informado o texto da snackbar de sucesso.");
  }
  if (cleaned.some((line) => /envia para o worker/i.test(line))) {
    gaps.push("Não foi especificado como validar o envio do comando ao worker.");
  }
  if (cleaned.some((line) => /salva no banco.+usuário.+data\/hora/i.test(line))) {
    gaps.push("Não foi informada a estrutura ou os campos da gravação do comando no banco além do comando, usuário e data/hora.");
  }
  cleaned.filter((line) => /(?:não informado|não definida?|não especificad[oa])/i.test(line)).forEach((line) => {
    gaps.push(`Indefinição identificada: ${line}`);
  });
  return { attentionPoints, technicalConstraints, businessRules, dependencies, technicalElements, gaps: uniqueValues(gaps) };
}

function extractRequirementStructure(lines: string[]): RequirementStructure {
  const acceptanceCriteria = extractSection(lines, SECTION_HEADERS.acceptance).length
    ? extractSection(lines, SECTION_HEADERS.acceptance)
    : extractSection(lines, SECTION_HEADERS.expected);
  const explicitGaps = extractSection(lines, SECTION_HEADERS.gaps);
  const structure = (header: RegExp) => extractSection(lines, header);
  const explicitBusinessRules = structure(STRUCTURE_HEADERS.businessRules);
  const explicitTechnicalConstraints = structure(STRUCTURE_HEADERS.technicalConstraints);
  const explicitTechnicalElements = structure(STRUCTURE_HEADERS.technicalElements);
  const narrative = inferNarrativeStructure(lines);
  const userStory = inferUserStory(lines, acceptanceCriteria);
  const inferredGaps = [
    ...(userStory.asA.length || userStory.iWant.length || userStory.soThat.length ? [] : ["Não foi possível derivar uma História de Usuário do conteúdo fornecido."]),
    ...(!acceptanceCriteria.length ? ["Critérios de aceitação não informados no conteúdo fornecido."] : []),
    ...narrative.gaps,
  ];
  const gaps = uniqueValues([...explicitGaps, ...inferredGaps]);
  return {
    userStory,
    acceptanceCriteria,
    businessRules: explicitBusinessRules.length ? explicitBusinessRules : narrative.businessRules,
    technicalConstraints: explicitTechnicalConstraints.length ? explicitTechnicalConstraints : narrative.technicalConstraints,
    flows: structure(STRUCTURE_HEADERS.flows),
    exceptions: structure(STRUCTURE_HEADERS.exceptions),
    data: structure(STRUCTURE_HEADERS.data),
    technicalElements: explicitTechnicalElements.length ? explicitTechnicalElements : narrative.technicalElements,
    dependencies: narrative.dependencies,
    attentionPoints: narrative.attentionPoints,
    gaps,
    gapDetails: classifyGaps(gaps),
  };
}

const EXPLICIT_ACTION = /^(?:ao\b|quando\b|inserir\b|adicionar\b|remover\b|criar\b|exibir\b|mostrar\b|enviar\b|consultar\b|validar\b|posicionar\b|permitir\b|atualizar\b|garantir\b|definir\b|selecionar\b|preencher\b|clicar\b|acessar\b|manter\b|habilitar\b|desabilitar\b|armazenar\b|salvar\b|o sistema deverá\b)/i;

function extractNumberedSteps(lines: string[]) {
  const values: string[] = [];
  let current = "";
  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    const numbered = rawLine.trim().replace(/^[•▪●]\s*/, "").match(/^\d+[.)]\s+(.+)$/);
    if (!line || Object.values(SECTION_HEADERS).some((header) => header.test(line))) {
      if (current) values.push(current);
      current = "";
      continue;
    }
    if (numbered) {
      if (current) values.push(current);
      current = numbered[1].trim();
    } else if (current && !DELIVERY_HEADER.test(line) && !TITLE_HEADER.test(line)) {
      current = `${current} ${line}`.trim();
    }
  }
  if (current) values.push(current);
  return values;
}

function extractExplicitActions(lines: string[]) {
  const values: string[] = [];
  let inAcceptance = false;
  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (SECTION_HEADERS.acceptance.test(line) || SECTION_HEADERS.expected.test(line)) {
      inAcceptance = true;
      continue;
    }
    if (inAcceptance || !line || Object.values(SECTION_HEADERS).some((header) => header.test(line))) continue;
    if (EXPLICIT_ACTION.test(line)) values.push(line);
  }
  return values;
}

function quotedTerms(value: string) {
  return Array.from(value.matchAll(/["“”]([^"“”]+)["“”]/g), (match) => match[1]);
}

type CommandRow = { name: string; id: string; source: string };

type NarrativeScenarioDraft = {
  title: string;
  preconditions: string[];
  data?: string[];
  steps: string[];
  expectedResult: string[];
};

function commandRows(lines: string[]): CommandRow[] {
  return lines.map(cleanLine).map((line) => {
    const match = line.match(/^(.+?)\s+[-–—]\s+(\d+|\?)\s*$/);
    return match ? { name: match[1].trim(), id: match[2], source: line } : null;
  }).filter((row): row is CommandRow => Boolean(row));
}

function narrativeScenario(
  draft: NarrativeScenarioDraft,
  deliveryId: string,
  index: number,
  storyTitle: string,
  lines: string[],
): GeneratedScenario {
  const gaps: string[] = [];
  return {
    id: `${deliveryId}-scenario-${index + 1}`,
    title: draft.title,
    storyTitle,
    origin: { storyTitle, page: sourcePage(lines), excerpt: sourceExcerpt(lines) },
    preconditions: draft.preconditions,
    data: draft.data ?? [],
    steps: draft.steps,
    expectedResult: draft.expectedResult,
    gaps,
    gapDetails: [],
    quality: "completo",
    sourceMode: "narrative",
    gherkin: gherkin(draft.title, draft.preconditions, draft.steps, draft.expectedResult),
    status: "pronto",
    reference: findReference(lines),
  };
}

function buildNarrativeScenarios(lines: string[], deliveryId: string, storyTitle: string): GeneratedScenario[] {
  const cleaned = narrativeContent(lines);
  const text = cleaned.join(" ");
  const buttonPlacement = cleaned.find((line) => /botão.+(?:dentro|na)\s+da?\s+seção/i.test(line));
  const openWindow = cleaned.find((line) => /botão.+abre.+janela lateral/i.test(line));
  const innerSection = cleaned.find((line) => /dentro da janela.+seção/i.test(line));
  const deviceDropdown = cleaned.find((line) => /^Dispositivo\s*:/i.test(line));
  const commandDropdown = cleaned.find((line) => /^Tipo de comando\s*:/i.test(line));
  const enableSend = cleaned.find((line) => /botão Enviar fica habilitado/i.test(line));
  const worker = cleaned.find((line) => /envia para o worker/i.test(line));
  const database = cleaned.find((line) => /salva no banco/i.test(line));
  const snackbar = cleaned.find((line) => /snackbar de sucesso/i.test(line));
  const commands = commandRows(lines);
  const drafts: NarrativeScenarioDraft[] = [];

  const [buttonName = "Comandos", sectionName = "Dispositivos"] = quotedTerms(buttonPlacement ?? "");
  const windowName = quotedTerms(openWindow ?? "")[0] ?? buttonName;
  const innerSectionName = quotedTerms(innerSection ?? "")[0] ?? "Enviar novo comando";

  if (buttonPlacement && (openWindow || innerSection)) {
    const preconditions = uniqueValues([
      ...(/ocorrências? da base.+objeto rastreável ativo/i.test(text) ? ["Possuir uma ocorrência da base com objeto rastreável ativo."] : []),
      ...(/dispositiv[oa]s? vinculad[oa]s?.+objeto rastreável/i.test(text) ? ["Possuir dispositivo vinculado ao objeto rastreável."] : []),
      `Acessar a seção "${sectionName}".`,
    ]);
    drafts.push({
      title: `Acessar ${buttonName}`,
      preconditions,
      steps: [
        `Identificar o botão "${buttonName}" dentro da seção "${sectionName}".`,
        `Acionar o botão "${buttonName}".`,
      ],
      expectedResult: uniqueValues([
        ...(openWindow ? [`Abrir a janela lateral "${windowName}".`] : []),
        ...(innerSection ? [`Exibir a seção "${innerSectionName}".`] : []),
      ]),
    });
  }

  if (deviceDropdown) {
    drafts.push({
      title: "Selecionar dispositivo",
      preconditions: [
        `Manter a janela lateral "${windowName}" aberta.`,
        "Possuir dispositivos vinculados ao objeto rastreável.",
      ],
      steps: [
        "Acionar o dropdown \"Dispositivo\".",
        "Consultar as opções disponíveis.",
        "Selecionar um dispositivo.",
      ],
      expectedResult: [
        "Exibir no dropdown \"Dispositivo\" a relação de seriais dos dispositivos vinculados ao objeto rastreável.",
        "Permitir a seleção de apenas um dispositivo.",
      ],
    });
  }

  if (commandDropdown) {
    drafts.push({
      title: "Selecionar tipo de comando",
      preconditions: [
        `Manter a janela lateral "${windowName}" aberta.`,
        "Ter um dispositivo selecionado.",
      ],
      data: commands.map((command) => command.source),
      steps: [
        "Acionar o dropdown \"Tipo de comando\".",
        "Consultar as opções disponíveis.",
        "Selecionar cada comando listado, individualmente.",
      ],
      expectedResult: [
        "Disponibilizar os seguintes comandos para seleção:",
        ...commands.map((command) => command.id === "?"
          ? `  - "${command.name}".`
          : `  - "${command.name}" — ID ${command.id}.`),
        "Permitir a seleção de apenas um tipo de comando.",
      ],
    });
  }

  if (enableSend || worker || database || snackbar) {
    drafts.push({
      title: "Enviar comando",
      preconditions: uniqueValues([
        `Manter a janela lateral "${windowName}" aberta.`,
        "Ter um dispositivo selecionado.",
        "Ter um tipo de comando selecionado.",
        ...(/timeout/i.test(text) ? ["Possuir a configuração de timeout disponível conforme o fluxo implementado."] : []),
      ]),
      steps: [
        ...(/timeout/i.test(text) ? ["Informar o timeout."] : []),
        ...(enableSend ? ["Verificar o estado do botão \"Enviar\"."] : []),
        "Acionar o botão \"Enviar\".",
      ],
      expectedResult: uniqueValues([
        ...(enableSend ? ["Habilitar o botão \"Enviar\" após determinar o dispositivo, o tipo de comando e o timeout."] : []),
        ...(worker ? ["Enviar o comando para o worker."] : []),
        ...(database ? ["Salvar no banco o comando enviado, o usuário que o enviou e a data/hora."] : []),
        ...(snackbar ? ["Exibir uma snackbar de sucesso no envio."] : []),
      ]),
    });
  }

  return drafts.map((draft, index) => narrativeScenario(draft, deliveryId, index, storyTitle, lines));
}

const SEMANTIC_BEHAVIOR_HEADER = /^(?:fluxo principal|fluxo alternativo|exceção|exceções|caminho alternativo)\s*:?$/i;

type SemanticBehaviorBlock = { label: string; lines: string[] };

function splitExplicitBehaviorBlocks(lines: string[]): SemanticBehaviorBlock[] {
  const starts = lines
    .map((line, index) => ({ line: cleanLine(line), index }))
    .filter(({ line }) => SEMANTIC_BEHAVIOR_HEADER.test(line));
  if (starts.length < 2) return [];
  const prefix = lines.slice(0, starts[0].index);
  return starts.map(({ line, index }, blockIndex) => ({
    label: line.replace(/:$/, "").trim(),
    lines: [...prefix, ...lines.slice(index, starts[blockIndex + 1]?.index ?? lines.length)],
  }));
}

function gherkin(title: string, preconditions: string[], steps: string[], expected: string[]) {
  if (title === "Título não informado" || !preconditions.length || !steps.length || !expected.length) return "";
  return [
    `Funcionalidade: ${title}`,
    `  Cenário: ${title}`,
    ...preconditions.map((item) => `    Dado ${item}`),
    ...steps.map((item, index) => `    ${index === 0 ? "Quando" : "E"} ${item}`),
    ...expected.map((item) => `    Então ${item}`),
  ].join("\n");
}

function buildScenarios(lines: string[], deliveryId: string, allowSemanticSplit = true, behaviorLabel = ""): GeneratedScenario[] {
  if (allowSemanticSplit) {
    const behaviorBlocks = splitExplicitBehaviorBlocks(lines);
    if (behaviorBlocks.length > 1) {
      return behaviorBlocks.flatMap((block, index) => buildScenarios(block.lines, `${deliveryId}-behavior-${index + 1}`, false, block.label))
        .map((scenario, index) => ({
          ...scenario,
          id: `${deliveryId}-scenario-${index + 1}`,
        }));
    }
  }
  const cleaned = lines.map(cleanLine).filter(Boolean);
  const hasStepMarker = cleaned.some((line) => STEP_MARKER.test(line));
  const hasScenarioHeader = cleaned.some((line) => TITLE_HEADER.test(line) || DELIVERY_HEADER.test(line) || Object.values(SECTION_HEADERS).some((header) => header.test(line)));
  if (!hasStepMarker && !hasScenarioHeader) return [];

  const baseTitle = findTitle(lines);
  const title = behaviorLabel ? `${baseTitle} — ${behaviorLabel}` : baseTitle;
  const sectionSteps = extractSection(lines, SECTION_HEADERS.steps);
  const numberedSteps = extractNumberedSteps(lines);
  const sourceMode = sectionSteps.length || numberedSteps.length ? "explicit" as const : "narrative" as const;
  if (sourceMode === "narrative") {
    const narrativeScenarios = buildNarrativeScenarios(lines, deliveryId, title);
    if (narrativeScenarios.length) return narrativeScenarios;
  }
  const preconditions = extractSection(lines, SECTION_HEADERS.preconditions);
  const data = extractSection(lines, STRUCTURE_HEADERS.data);
  const extractedActions = extractExplicitActions(lines);
  const allSteps = sectionSteps.length ? sectionSteps : numberedSteps.length ? numberedSteps : extractedActions;
  const explicitExpected = extractSection(lines, SECTION_HEADERS.expected);
  const acceptanceExpected = extractSection(lines, SECTION_HEADERS.acceptance);
  const expectedResult = explicitExpected.length ? explicitExpected : acceptanceExpected;
  const explicitGaps = extractSection(lines, SECTION_HEADERS.gaps);
  const semanticGap = behaviorLabel && !expectedResult.length
    ? [`${behaviorLabel} sem informação explícita de resultado esperado.`]
    : [];
  const gaps = [
    ...explicitGaps,
    ...semanticGap,
    ...(title === "Título não informado" ? ["Título não informado nos artefatos."] : []),
    ...(!preconditions.length ? ["Pré-condições não informadas nos artefatos."] : []),
    ...(!allSteps.length ? ["Passos não informados nos artefatos."] : []),
    ...(!expectedResult.length ? ["Resultado esperado não informado nos artefatos."] : []),
  ];
  return [{
    id: `${deliveryId}-scenario-1`,
    title,
    storyTitle: title,
    origin: { storyTitle: title, page: sourcePage(lines), excerpt: sourceExcerpt(lines) },
    preconditions,
    data,
    steps: allSteps,
    expectedResult,
    gaps,
    gapDetails: classifyGaps(gaps),
    quality: qualityFor(gaps),
    sourceMode,
    gherkin: gherkin(title, preconditions, allSteps, expectedResult),
    status: gaps.length ? "a confirmar" : "pronto",
    reference: findReference(lines),
  }];
}

export function formatScenario(scenario: GeneratedScenario) {
  const numbered = (items: string[]) => items.length ? items.map((item, index) => `${index + 1}. ${item}`).join("\n") : NOT_INFORMED;
  const bullets = (items: string[]) => items.length ? items.map((item) => item.startsWith("  - ") ? item : `- ${item}`).join("\n") : NOT_INFORMED;
  const data = scenario.data ?? [];
  const showData = scenario.sourceMode !== "narrative" && data.length > 0;
  const gaps = scenario.gaps.length ? bullets(scenario.gaps) : "Nenhuma lacuna registrada.";
  return [
    `STEP ${scenario.id.match(/scenario-(\d+)$/)?.[1] ?? "1"}`,
    "",
    "Pré-condições",
    "",
    bullets(scenario.preconditions),
    "",
    ...(showData ? ["Dados de teste", "", bullets(data), ""] : []),
    "Passos",
    "",
    numbered(scenario.steps),
    "",
    "Resultado esperado",
    "",
    bullets(scenario.expectedResult),
    ...(scenario.gaps.length ? ["", "Gaps e indefinições", "", gaps] : []),
  ].join("\n");
}

export function organizeQaMaterial(source: string): OrganizedQaMaterial | null {
  if (!source.trim()) return null;
  const lines = splitLines(source);
  const groups = splitDeliveries(lines);
  const deliveries = groups.map((group, deliveryIndex) => {
    const sourceText = group.join("\n").trim();
    const id = `delivery-${deliveryIndex + 1}`;
    const storyGroups = splitExplicitStories(group);
    const entries = storyGroups.length ? storyGroups : [group];
    const stories = entries.map((storyLines, storyIndex) => {
      const storyId = `${id}-story-${storyIndex + 1}`;
      const storyTitle = findTitle(storyLines);
      const requirement = extractRequirementStructure(storyLines);
      const scenarios = buildScenarios(storyLines, storyId).map((scenario) => ({ ...scenario, storyTitle, origin: { storyTitle, page: sourcePage(storyLines) ?? sourcePage(group), excerpt: sourceExcerpt(storyLines) } }));
      return { id: storyId, title: storyTitle, sourceText: storyLines.join("\n").trim(), requirement, scenarioIds: scenarios.map((scenario) => scenario.id), scenarios };
    });
    const scenarios = stories.flatMap((story) => story.scenarios);
    const requirement = extractRequirementStructure(group);
    return { id, title: findTitle(group), sourceText, scenarios, requirement, stories };
  });
  const validatedDeliveries = deliveries.map((delivery) => ({
    ...delivery,
    scenarios: delivery.scenarios.map((scenario) => {
      const validation = validateScenarioAgainstSource(delivery.sourceText, scenario);
      const contextualRequirementGaps = scenario.sourceMode === "narrative"
        ? []
        : delivery.requirement.gaps.filter((gap) => !/Critérios de aceitação não informados|Não foi possível derivar uma História de Usuário/i.test(gap));
      const gaps = Array.from(new Set([...scenario.gaps, ...contextualRequirementGaps, ...validation.warnings]));
      const inconsistent = validation.warnings.some((warning) => /sem correspondência literal|sem rastreabilidade suficiente|conflito|sem origem/i.test(warning))
        || gaps.some((gap) => /conflito|sem origem/i.test(gap));
      return {
        ...scenario,
        gaps,
        gapDetails: classifyGaps(gaps),
        traceability: validation.traceability,
        quality: qualityFor(gaps, inconsistent),
        gherkin: gaps.length ? "" : scenario.gherkin,
        status: gaps.length ? "a confirmar" as const : scenario.status,
      };
    }),
  }));
  const scenarios = validatedDeliveries.flatMap((delivery) => delivery.scenarios);
  const requirements = validatedDeliveries.map((delivery) => delivery.requirement);
  return { deliveries: validatedDeliveries, scenarios, sourceLineCount: lines.filter((line) => cleanLine(line)).length, requirements };
}

export { NOT_INFORMED };
