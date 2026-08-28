declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(source: { data: Uint8Array }): { promise: Promise<{
    numPages: number;
    getPage(pageNumber: number): Promise<{
      getTextContent(): Promise<{ items: Array<{ str?: string }> }>;
      getViewport(options: { scale: number }): { width: number; height: number };
      render(options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }): { promise: Promise<void> };
    }>;
    destroy(): Promise<void>;
  }> };
}

declare module "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url" {
  const workerUrl: string;
  export default workerUrl;
}
