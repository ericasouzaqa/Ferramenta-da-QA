export function appendEvidenceBlocks(source: string, blocks: string[]): string {
  return [source.trim(), ...blocks.filter(Boolean)].filter(Boolean).join("\n\n");
}

export function formatLogEvidence(fileName: string, content: string): string {
  return `[LOG · ${fileName}]\n${content || "(arquivo sem conteúdo textual)"}\n[FIM DO LOG · ${fileName}]`;
}

export function countLogLines(content: string): number {
  return content ? content.split(/\r?\n/).length : 0;
}

export function formatImageEvidence(fileName: string, visibleEvidence: string[], attention: string[]): string {
  const lines = [
    `[IMAGEM · ${fileName}]`,
    ...visibleEvidence.map((item) => `Evidência visual observada: ${item}`),
    ...attention.map((item) => `A confirmar na imagem: ${item}`),
    `[FIM DA IMAGEM · ${fileName}]`,
  ];
  return lines.join("\n");
}

export function formatUninspectedImage(fileName: string): string {
  return `[IMAGEM · ${fileName}]\nEvidência visual anexada. A descrição legível depende de sessão autenticada e permanece a confirmar.\n[FIM DA IMAGEM · ${fileName}]`;
}
