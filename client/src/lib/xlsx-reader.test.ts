import { describe, expect, it } from "vitest";
import { spreadsheetSourceText } from "./xlsx-reader";

describe("spreadsheetSourceText", () => {
  it("preserva todas as abas, cabeçalhos, linhas e células vazias no texto de origem", () => {
    const source = spreadsheetSourceText("massa_e_regras.xlsx", [
      {
        name: "Campos obrigatórios",
        headers: ["Campo", "Regra", "Observação"],
        rows: [["Placa", "Obrigatório", ""], ["UF", "", "Aceita sigla"]],
      },
      {
        name: "Sem cabeçalho",
        headers: [],
        rows: [["valor isolado", ""]],
      },
    ]);

    expect(source).toContain("[Planilha: massa_e_regras.xlsx]");
    expect(source).toContain("[Aba: Campos obrigatórios]");
    expect(source).toContain("Cabeçalhos: Campo | Regra | Observação");
    expect(source).toContain("Linha 2: Campo=Placa | Regra=Obrigatório | Observação=(vazio)");
    expect(source).toContain("Linha 3: Campo=UF | Regra=(vazio) | Observação=Aceita sigla");
    expect(source).toContain("[Aba: Sem cabeçalho]");
    expect(source).toContain("(Aba sem cabeçalhos preenchidos.)");
    expect(source).toContain("Linha 2: Coluna 1=valor isolado | Coluna 2=(vazio)");
  });
});
