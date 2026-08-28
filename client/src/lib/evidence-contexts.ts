export type EvidenceContext = {
  id: string;
  origin: "PDF" | "Imagem" | "Log" | "Planilha";
  title: string;
  sourceExcerpts: string[];
  visualEvidence: string[];
  attention: string[];
  status: "fornecido" | "a confirmar";
};

export function createLogContext(fileName: string, content: string, id: string): EvidenceContext {
  return {
    id,
    origin: "Log",
    title: `Log · ${fileName}`,
    sourceExcerpts: [content || "(arquivo sem conteúdo textual)"],
    visualEvidence: [],
    attention: [],
    status: "fornecido",
  };
}

export function createImageContext(fileName: string, visibleEvidence: string[], attention: string[], id: string): EvidenceContext {
  return {
    id,
    origin: "Imagem",
    title: `Imagem · ${fileName}`,
    sourceExcerpts: [],
    visualEvidence: visibleEvidence,
    attention: attention.length || visibleEvidence.length ? attention : ["Imagem anexada sem descrição legível; confirmar a evidência visual em sessão autenticada."],
    status: attention.length ? "a confirmar" : visibleEvidence.length ? "fornecido" : "a confirmar",
  };
}

export function createSpreadsheetContext(fileName: string, content: string, sheetNames: string[], id: string): EvidenceContext {
  return {
    id,
    origin: "Planilha",
    title: `Planilha · ${fileName}`,
    sourceExcerpts: [content || "(planilha sem células preenchidas)"],
    visualEvidence: [],
    attention: sheetNames.length ? [] : ["A planilha não contém abas identificáveis; confirme o arquivo de origem."],
    status: sheetNames.length ? "fornecido" : "a confirmar",
  };
}

export function evidenceContextToSourceBlock(context: EvidenceContext): string {
  return [
    `Título: ${context.title}`,
    `Origem: ${context.origin}`,
    ...context.sourceExcerpts,
    ...context.visualEvidence.map((item) => `Evidência visual observada: ${item}`),
    ...context.attention.map((item) => `A confirmar: ${item}`),
  ].join("\n");
}
