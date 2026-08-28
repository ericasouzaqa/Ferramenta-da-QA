/**
 * Leitura local de páginas e preservação da evidência textual:
 * every page is read in order. Text and rendered evidence remain separate so a
 * visual observation can never silently become a requirement.
 */

export type PdfPageExtraction = {
  page: number;
  text: string;
  imageDataUrl: string;
};

export type PdfExtraction = {
  text: string;
  pageCount: number;
  hasSearchableText: boolean;
  previewFailures: number;
  pages: PdfPageExtraction[];
};

type PdfTextItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  hasEOL?: boolean;
};

type PdfPageLike = {
  getTextContent: () => Promise<{ items: unknown[] }>;
  getViewport: (params: { scale: number }) => { width: number; height: number };
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<unknown> };
};

const MAX_PAGE_PREVIEW_LENGTH = 1_450_000;
const MIN_RENDER_SCALE = 0.42;

let readerPromise: Promise<{ getDocument: typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument }> | null = null;

function loadPdfReader() {
  if (!readerPromise) {
    readerPromise = Promise.all([
      import("pdfjs-dist/legacy/build/pdf.mjs"),
      import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return { getDocument: pdfjs.getDocument };
    });
  }
  return readerPromise;
}

function normalizedFragment(item: PdfTextItem): string {
  return (item.str ?? "").replaceAll("\u00a0", " ");
}

function isWordLike(value: string): boolean {
  return /[A-Za-zÀ-ÖØ-öø-ÿ0-9]/.test(value);
}

function hasExplicitBoundary(previous: PdfTextItem | undefined, current: PdfTextItem): boolean {
  if (!previous) return false;
  if (previous.hasEOL) return true;
  const previousY = previous.transform?.[5];
  const currentY = current.transform?.[5];
  if (previousY === undefined || currentY === undefined) return false;
  const height = Math.max(Math.abs(previous.height ?? 0), Math.abs(current.height ?? 0), 8);
  return Math.abs(previousY - currentY) > Math.max(2, height * 0.45);
}

function needsSpace(previousText: string, previous: PdfTextItem | undefined, currentText: string, current: PdfTextItem): boolean {
  if (!previous || !previousText || !currentText) return false;
  if (/\s$/.test(previousText) || /^\s/.test(currentText)) return false;
  if (/^[,.;:!?%\]\)}]/.test(currentText) || /[\[({/]$/.test(previousText)) return false;
  const previousX = previous.transform?.[4];
  const currentX = current.transform?.[4];
  if (previousX !== undefined && currentX !== undefined) {
    const rightEdge = previousX + Math.abs(previous.width ?? 0);
    const height = Math.max(Math.abs(previous.height ?? 0), Math.abs(current.height ?? 0), 8);
    return currentX - rightEdge > Math.max(1.5, height * 0.18);
  }
  return isWordLike(previousText) && isWordLike(currentText);
}

function needsColumnSeparator(previous: PdfTextItem | undefined, current: PdfTextItem, tabularRow: boolean): boolean {
  if (!previous) return false;
  const combinesHeading = /\b(?:SC-\d+|PBI\d+|RF\d+)\b/i.test(normalizedFragment(previous))
    || /\b(?:SC-\d+|PBI\d+|RF\d+)\b/i.test(normalizedFragment(current));
  if (combinesHeading) return false;
  const previousX = previous.transform?.[4];
  const currentX = current.transform?.[4];
  if (previousX === undefined || currentX === undefined) return false;
  const rightEdge = previousX + Math.abs(previous.width ?? 0);
  const height = Math.max(Math.abs(previous.height ?? 0), Math.abs(current.height ?? 0), 8);
  return currentX - rightEdge > (tabularRow ? Math.max(10, height * 0.8) : Math.max(48, height * 4));
}

function joinLine(items: PdfTextItem[]): string {
  let line = "";
  let previous: PdfTextItem | undefined;
  const xValues = items.map((item) => item.transform?.[4]).filter((value): value is number => value !== undefined);
  const tabularRow = items.length >= 3
    && xValues.length === items.length
    && Math.min(...xValues) <= 65
    && Math.max(...xValues) - Math.min(...xValues) >= 120;
  for (const item of items) {
    const fragment = normalizedFragment(item);
    const sameColumnContinuation = tabularRow && previous
      && Math.abs((previous.transform?.[4] ?? Number.NaN) - (item.transform?.[4] ?? Number.NaN)) <= 3
      && Math.abs((previous.transform?.[5] ?? Number.NaN) - (item.transform?.[5] ?? Number.NaN)) > 1;
    const changesTableColumn = previous
      && tabularRow
      && Math.abs((previous.transform?.[4] ?? Number.NaN) - (item.transform?.[4] ?? Number.NaN)) > 3
      && !/\b(?:SC-\d+|PBI\d+|RF\d+)\b/i.test(normalizedFragment(previous))
      && !/\b(?:SC-\d+|PBI\d+|RF\d+)\b/i.test(fragment);
    const previousFragment = previous ? normalizedFragment(previous) : "";
    const continuationIsSeparateWord = /\s/.test(previousFragment)
      || /^(?:a|ao|à|com|da|das|de|do|dos|e|em|no|na|nos|nas|o|os|para|por|to)$/i.test(previousFragment.trim())
      || /^(?:a|ao|à|com|da|das|de|do|dos|e|em|no|na|nos|nas|o|os|para|por|to)\b/i.test(fragment)
      || /^[A-ZÀ-ÖØ-Þ]/.test(fragment)
      || (/^[A-ZÀ-ÖØ-Þ]/.test(previousFragment) && fragment.length > 4 && !/^(?:ções?|ões|mente|dade)\b/i.test(fragment));
    if (sameColumnContinuation && continuationIsSeparateWord) line += " ";
    else if (changesTableColumn) line += "\t";
    else if (needsColumnSeparator(previous, item, tabularRow)) line += "\t";
    else if (needsSpace(line, previous, fragment, item)) line += " ";
    line += fragment;
    previous = item;
  }
  return line.trimEnd();
}

function reconstructInSourceOrder(fragments: PdfTextItem[]): string {
  const lines: string[] = [];
  let line = "";
  let previous: PdfTextItem | undefined;

  for (const item of fragments) {
    const fragment = normalizedFragment(item);
    if (hasExplicitBoundary(previous, item) && line.trim()) {
      lines.push(line.trimEnd());
      line = "";
    }
    if (needsSpace(line, previous, fragment, item)) line += " ";
    line += fragment;
    previous = item;
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines.join("\n").trim();
}

type PositionedFragment = PdfTextItem & { index: number; x: number; y: number; lineHeight: number };

function detectTableColumns(items: PositionedFragment[]): number[] {
  const buckets = new Map<number, number>();
  for (const item of items) {
    const bucket = Math.round(item.x / 4) * 4;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  const candidates = Array.from(buckets.entries())
    .filter(([, count]) => count >= 2)
    .map(([x]) => x)
    .sort((a, b) => a - b);
  return candidates.reduce<number[]>((columns, candidate) => {
    const previous = columns[columns.length - 1];
    if (previous === undefined || candidate - previous > 12) columns.push(candidate);
    return columns;
  }, []);
}

function positionedFragments(fragments: PdfTextItem[]): PositionedFragment[] | null {
  const positioned = fragments.map((item, index) => {
    const x = item.transform?.[4];
    const y = item.transform?.[5];
    if (x === undefined || y === undefined) return null;
    return { ...item, index, x, y, lineHeight: Math.max(Math.abs(item.height ?? 0), 8) };
  });
  return positioned.every((item): item is PositionedFragment => item !== null) ? positioned : null;
}

/**
 * Reconstructs a page by its visible reading order. PDF text operators can be
 * emitted in a different sequence from the visual line (notably in headings and
 * tables), so positioned fragments are grouped by baseline and ordered left to
 * right. Files without usable coordinates deliberately keep their source order.
 */
export function reconstructPdfPageText(items: unknown[]): string {
  const fragments = items
    .filter((item): item is PdfTextItem => typeof item === "object" && item !== null && "str" in item)
    .filter((item) => Boolean(normalizedFragment(item)));
  const positioned = positionedFragments(fragments);
  if (!positioned) return reconstructInSourceOrder(fragments);

  const tableColumns = detectTableColumns(positioned);
  const hasTableLayout = tableColumns.length >= 3 && tableColumns[0] <= 68 && tableColumns.at(-1)! - tableColumns[0] >= 120;
  const matchesTableColumn = (item: PositionedFragment) => hasTableLayout && tableColumns.some((column) => Math.abs(column - item.x) <= 5);
  const matchesFirstTableColumn = (item: PositionedFragment) => hasTableLayout && Math.abs(tableColumns[0] - item.x) <= 5;
  const rows: Array<{ baseline: number; height: number; items: PositionedFragment[] }> = [];
  for (const item of [...positioned].sort((a, b) => b.y - a.y || a.x - b.x || a.index - b.index)) {
    const currentRow = rows[rows.length - 1];
    const tolerance = currentRow ? Math.max(3, Math.min(currentRow.height, item.lineHeight) * 0.92) : 0;
    const currentRowHasTableAnchor = currentRow?.items.some(matchesFirstTableColumn);
    const currentRowTableColumns = currentRow ? new Set(currentRow.items.filter(matchesTableColumn).map((entry) => tableColumns.reduce((closest, column, index) => (
      Math.abs(column - entry.x) < Math.abs(tableColumns[closest] - entry.x) ? index : closest
    ), 0))).size : 0;
    const continuesColumn = Boolean(currentRow
      && currentRowHasTableAnchor
      && matchesTableColumn(item)
      && (Math.abs(currentRow.baseline - item.y) <= tolerance
        || (currentRowTableColumns >= 2 && Math.abs(currentRow.baseline - item.y) <= Math.max(25, Math.min(currentRow.height, item.lineHeight) * 2.1))));
    const continuesWordFragment = Boolean(currentRow
      && currentRowHasTableAnchor
      && normalizedFragment(item).trim().length <= 4
      && currentRow.items.some((existing) => Math.abs(existing.x - item.x) <= 3 && /[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(normalizedFragment(existing))));
    if (!currentRow || (Math.abs(currentRow.baseline - item.y) > tolerance && !continuesColumn && !continuesWordFragment)) {
      rows.push({ baseline: item.y, height: item.lineHeight, items: [item] });
      continue;
    }
    currentRow.items.push(item);
    currentRow.baseline = (currentRow.baseline * (currentRow.items.length - 1) + item.y) / currentRow.items.length;
    currentRow.height = Math.max(currentRow.height, item.lineHeight);
  }

  if (hasTableLayout) {
    const columnIndex = (item: PositionedFragment) => tableColumns.reduce((closest, column, index) => (
      Math.abs(column - item.x) < Math.abs(tableColumns[closest] - item.x) ? index : closest
    ), 0);
    for (let index = 0; index < rows.length - 1; index += 1) {
      const current = rows[index];
      const following = rows[index + 1];
      const currentColumns = new Set(current.items.filter(matchesTableColumn).map(columnIndex));
      const followingColumns = new Set(following.items.filter(matchesTableColumn).map(columnIndex));
      const followsCurrentRow = followingColumns.has(0)
        && Array.from(followingColumns).every((column) => currentColumns.has(column))
        && followingColumns.size < currentColumns.size
        && Math.abs(current.baseline - following.baseline) <= 35;
      const overlapsWithinTableRow = currentColumns.size >= 2
        && followingColumns.size >= 2
        && Math.abs(current.baseline - following.baseline) <= 25
        && (currentColumns.size !== followingColumns.size
          || Array.from(currentColumns).some((column) => !followingColumns.has(column)));
      if (!followsCurrentRow && !overlapsWithinTableRow) continue;
      current.items.push(...following.items);
      current.height = Math.max(current.height, following.height);
      rows.splice(index + 1, 1);
      index -= 1;
    }

  }

  return rows
    .map((row) => joinLine([...row.items].sort((a, b) => a.x - b.x || a.index - b.index)))
    .filter(Boolean)
    .join("\n")
    .trim();
}

/** Retorna texto de origem mantendo marcadores de todas as páginas, inclusive sem camada textual. */
export function pdfSourceText(extraction: Pick<PdfExtraction, "text" | "pages">): string {
  if (extraction.text.trim()) return extraction.text;
  return extraction.pages.map((page) => [
    `[Página ${page.page}]`,
    "(Sem camada de texto pesquisável. A evidência visual deve ser confirmada manualmente.)",
  ].join("\n")).join("\n\n");
}

async function renderPagePreview(page: PdfPageLike): Promise<string> {
  let scale = 1.25;
  let quality = 0.78;
  while (scale >= MIN_RENDER_SCALE) {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a prévia da página.");
    await page.render({ canvasContext: context, viewport }).promise;
    const imageDataUrl = canvas.toDataURL("image/jpeg", quality);
    if (imageDataUrl.length <= MAX_PAGE_PREVIEW_LENGTH) return imageDataUrl;
    scale *= 0.72;
    quality = Math.max(0.6, quality - 0.08);
  }
  throw new Error("A prévia visual da página excede o limite seguro de análise. Divida o PDF ou reduza a resolução antes de importar.");
}

export async function extractPdfEvidence(file: File): Promise<PdfExtraction> {
  const { getDocument } = await loadPdfReader();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes });
  const pdfDocument = await loadingTask.promise;
  const pageCount = pdfDocument.numPages;
  const pages: PdfPageExtraction[] = [];
  let previewFailures = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber) as PdfPageLike;
      const content = await page.getTextContent();
      const text = reconstructPdfPageText(content.items);
      let imageDataUrl = "";
      try {
        imageDataUrl = await renderPagePreview(page);
      } catch {
        previewFailures += 1;
      }
      pages.push({ page: pageNumber, text, imageDataUrl });
    }
  } finally {
    const documentLifecycle = pdfDocument as unknown as { cleanup?: () => void; destroy?: () => Promise<void> };
    if (typeof documentLifecycle.cleanup === "function") documentLifecycle.cleanup();
    else if (typeof documentLifecycle.destroy === "function") await documentLifecycle.destroy();
  }

  return {
    text: pages.filter((page) => page.text).map((page) => `[Página ${page.page}]\n${page.text}`).join("\n\n"),
    pageCount,
    hasSearchableText: pages.some((page) => Boolean(page.text)),
    previewFailures,
    pages,
  };
}

export const extractSearchablePdfText = extractPdfEvidence;
