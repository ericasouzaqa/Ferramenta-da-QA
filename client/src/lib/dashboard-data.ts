/**
 * Design philosophy — Caderno de Evidências:
 * editable browser-only records use explicit operational fields, so no case
 * becomes a visually attractive but locked example.
 */
export type CaseStatus = "Pronto" | "Atenção" | "Bloqueado";
export type CaseChannel = "WhatsApp" | "SMS" | "Voz" | "Web";
export type CaseKind = "Funcional" | "IA / contexto" | "Integração" | "Segurança" | "Resiliência";
export type CasePriority = "P0" | "P1" | "P2";

export type TestCase = {
  id: string;
  name: string;
  kind: CaseKind;
  channel: CaseChannel;
  priority: CasePriority;
  status: CaseStatus;
  latency: number;
  cost: number;
  owner: string;
  updatedAt: string;
};

export type ProjectContext = {
  projectName: string;
  objective: string;
  model: string;
  environment: string;
  contextText: string;
};

export const initialContext: ProjectContext = {
  projectName: "Ferramenta da QA",
  objective: "Ler documentação, separar entregas, organizar testes e abrir bugs com base na fonte.",
  model: "Não informado",
  environment: "Homologação",
  contextText: "Cole ou importe o contexto que precisa ser organizado.",
};

export const initialCases: TestCase[] = [];

export const kindOptions: CaseKind[] = ["Funcional", "IA / contexto", "Integração", "Segurança", "Resiliência"];
export const channelOptions: CaseChannel[] = ["WhatsApp", "SMS", "Voz", "Web"];
export const priorityOptions: CasePriority[] = ["P0", "P1", "P2"];
export const statusOptions: CaseStatus[] = ["Pronto", "Atenção", "Bloqueado"];
