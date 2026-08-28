import { describe, expect, it } from "vitest";
import { appendEvidenceBlocks, countLogLines, formatImageEvidence, formatLogEvidence, formatUninspectedImage } from "./evidence-sources";

describe("evidence sources", () => {
  it("preserva o log integral entre marcadores de origem", () => {
    const rawLog = "ERROR 500\nrequestId=abc";
    const source = appendEvidenceBlocks("Título: Falha ao salvar", [formatLogEvidence("api.log", rawLog)]);

    expect(source).toContain("Título: Falha ao salvar");
    expect(source).toContain("[LOG · api.log]");
    expect(source).toContain(rawLog);
    expect(source).toContain("[FIM DO LOG · api.log]");
    expect(countLogLines(rawLog)).toBe(2);
  });

  it("registra somente observações e pontos de confirmação da imagem", () => {
    const source = formatImageEvidence("erro.png", ["Mensagem 403 visível"], ["Campo de contexto não aparece completo"]);

    expect(source).toContain("Evidência visual observada: Mensagem 403 visível");
    expect(source).toContain("A confirmar na imagem: Campo de contexto não aparece completo");
    expect(source).not.toContain("causa raiz");
  });

  it("mantém uma imagem sem sessão como evidência a confirmar", () => {
    expect(formatUninspectedImage("falha.jpg")).toContain("permanece a confirmar");
  });
});
