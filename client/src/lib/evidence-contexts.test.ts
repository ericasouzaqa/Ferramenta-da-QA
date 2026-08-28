import { describe, expect, it } from "vitest";
import { organizeQaMaterial } from "./qa-organizer";
import { appendEvidenceBlocks } from "./evidence-sources";
import { createImageContext, createLogContext, evidenceContextToSourceBlock } from "./evidence-contexts";

describe("evidence contexts", () => {
  it("transforma um log em contexto rastreável e disponível para organização", () => {
    const rawLog = "Erro: a solicitação retorna 500 ao salvar";
    const context = createLogContext("backend.log", rawLog, "log-1");
    const source = appendEvidenceBlocks("", [evidenceContextToSourceBlock(context)]);
    const material = organizeQaMaterial(source, "completo");

    expect(context.origin).toBe("Log");
    expect(source).toContain("Título: Log · backend.log");
    expect(source).toContain(rawLog);
    expect(material).not.toBeNull();
  });

  it("mantém imagem sem leitura como contexto a confirmar", () => {
    const context = createImageContext("erro.png", [], [], "image-1");
    const source = evidenceContextToSourceBlock(context);

    expect(context.status).toBe("a confirmar");
    expect(source).toContain("Origem: Imagem");
    expect(source).toContain("A confirmar:");
  });

  it("preserva somente observações e alertas devolvidos para uma imagem", () => {
    const context = createImageContext("tela.png", ["Mensagem 403 visível"], ["Rodapé cortado"], "image-2");
    const source = evidenceContextToSourceBlock(context);

    expect(source).toContain("Evidência visual observada: Mensagem 403 visível");
    expect(source).toContain("A confirmar: Rodapé cortado");
    expect(source).not.toContain("causa raiz");
  });
});
