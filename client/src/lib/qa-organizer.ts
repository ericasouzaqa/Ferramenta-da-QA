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
  return lines.map(cleanLine).filter((line) => line && !GENERIC_LINE.test(line) && !ALL_STRUCTURE_HEADERS.some((header) => header.test(line)));
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
  const businessRules = uniqueValues(cleaned.filter((line) => NARRATIVE_RULE.test(line) && !NARRATIVE_CONSTRAINT.test(line)));
  const dependencies = uniqueValues(cleaned.filter((line) => NARRATIVE_DEPENDENCY.test(line)));
  const technicalElements = uniqueValues(cleaned.filter((line) => NARRATIVE_TECHNICAL.test(line)));
  const undefinedValues = cleaned.filter((line) => /(?:\?\s*$|ausência de documentação|não informado|não definida?|não especificad[oa])/i.test(line));
  const gaps = uniqueValues(undefinedValues.map((line) => `Indefinição identificada: ${line}`));
  return { attentionPoints, technicalConstraints, businessRules, dependencies, technicalElements, gaps };
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

function professionalNarrativeSteps(lines: string[], fallback: string[]) {
  const cleaned = narrativeContent(lines);
  const steps: string[] = [];
  const buttonPlacement = cleaned.find((line) => /botão.+(?:dentro|na)\s+da?\s+seção/i.test(line));
  if (buttonPlacement) {
    const [button, section] = quotedTerms(buttonPlacement);
    if (section) steps.push(`Acessar a seção "${section}".`);
    if (button) steps.push(`Acionar o botão "${button}".`);
  }
  const device = cleaned.find((line) => /^Dispositivo\s*:/i.test(line));
  if (device) steps.push("Selecionar um dispositivo vinculado ao objeto rastreável.");
  const command = cleaned.find((line) => /^Tipo de comando\s*:/i.test(line));
  if (command) steps.push("Selecionar um tipo de comando disponível para o dispositivo.");
  if (cleaned.some((line) => /tipo de comando e timeout.+botão Enviar fica habilitado/i.test(line))) {
    steps.push("Informar o timeout descrito para o envio.");
  }
  if (cleaned.some((line) => /(?:após enviar|botão Enviar fica habilitado|snackbar de sucesso no envio)/i.test(line))) {
    steps.push("Acionar o botão " + '"Enviar"' + ".");
  }
  return uniqueValues(steps.length ? steps : fallback);
}

function professionalNarrativeExpected(lines: string[], fallback: string[]) {
  const cleaned = narrativeContent(lines);
  const observable = cleaned.filter((line) => /(?:abre a janela|dentro da janela há|botão Enviar fica habilitado|envia para o worker|salva no banco|snackbar de sucesso)/i.test(line));
  return uniqueValues([...observable, ...fallback]);
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
  const preconditions = extractSection(lines, SECTION_HEADERS.preconditions);
  const data = extractSection(lines, STRUCTURE_HEADERS.data);
  const sectionSteps = extractSection(lines, SECTION_HEADERS.steps);
  const numberedSteps = extractNumberedSteps(lines);
  const extractedActions = extractExplicitActions(lines);
  const sourceMode = sectionSteps.length || numberedSteps.length ? "explicit" as const : "narrative" as const;
  const allSteps = sectionSteps.length
    ? sectionSteps
    : numberedSteps.length
      ? numberedSteps
      : professionalNarrativeSteps(lines, extractedActions);
  const explicitExpected = extractSection(lines, SECTION_HEADERS.expected);
  const acceptanceExpected = extractSection(lines, SECTION_HEADERS.acceptance);
  const expectedResult = explicitExpected.length
    ? explicitExpected
    : sourceMode === "narrative"
      ? professionalNarrativeExpected(lines, acceptanceExpected)
      : acceptanceExpected;
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
  const list = (items: string[]) => items.length ? items.map((item, index) => `${index + 1}. ${item}`).join("\n") : NOT_INFORMED;
  const preconditions = [
    ...scenario.preconditions,
    ...(scenario.data ?? []).map((item) => `Dados: ${item}`),
  ];
  const gaps = scenario.gaps.length ? scenario.gaps.map((item, index) => `${index + 1}. ${item}`).join("\n") : "Nenhuma lacuna registrada.";
  return [
    `STEP ${scenario.id.match(/scenario-(\d+)$/)?.[1] ?? "1"} - ${scenario.title}`,
    "",
    "Pré-condições",
    list(preconditions),
    "",
    "Passos",
    list(scenario.steps),
    "",
    "Resultado esperado",
    list(scenario.expectedResult),
    ...(scenario.gaps.length ? ["", "Gaps e indefinições", gaps] : []),
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
      const gaps = Array.from(new Set([...scenario.gaps, ...validation.warnings]));
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
