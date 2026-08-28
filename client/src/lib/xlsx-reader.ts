export type SpreadsheetSheetEvidence = {
  name: string;
  headers: string[];
  rows: string[][];
};

export type SpreadsheetExtraction = {
  sourceText: string;
  sheetCount: number;
  rowCount: number;
  sheets: SpreadsheetSheetEvidence[];
};

function cellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).replaceAll("\r\n", "\n").trim();
}

export function spreadsheetSourceText(fileName: string, sheets: SpreadsheetSheetEvidence[]): string {
  return [
    `[Planilha: ${fileName}]`,
    ...sheets.flatMap((sheet) => [
      `[Aba: ${sheet.name}]`,
      sheet.headers.length ? `Cabeçalhos: ${sheet.headers.join(" | ")}` : "(Aba sem cabeçalhos preenchidos.)",
      ...sheet.rows.map((row, index) => `Linha ${index + 2}: ${row.map((value, column) => `${sheet.headers[column] || `Coluna ${column + 1}` }=${value || "(vazio)"}`).join(" | ")}`),
    ]),
  ].join("\n");
}

/** Reads all populated spreadsheet cells locally; it does not infer rules from columns or values. */
export async function extractSpreadsheetEvidence(file: File): Promise<SpreadsheetExtraction> {
  const { default: readXlsxFile } = await import("read-excel-file/browser");
  const sheets = (await readXlsxFile(file)).map((sheet) => {
    const rows = sheet.data
      .map((row) => row.map(cellText))
      .filter((row) => row.some(Boolean));
    const [headers = [], ...dataRows] = rows;
    return { name: sheet.sheet, headers, rows: dataRows };
  });
  return {
    sourceText: spreadsheetSourceText(file.name, sheets),
    sheetCount: sheets.length,
    rowCount: sheets.reduce((total, sheet) => total + sheet.rows.length, 0),
    sheets,
  };
}
