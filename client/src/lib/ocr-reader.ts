import { createWorker } from "tesseract.js";

export type OcrResult = {
  text: string;
  confidence: number;
  warning: string;
};

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;

function assetUrl(name: string) {
  return new URL(`${import.meta.env.BASE_URL}ocr/${name}`, window.location.href).href;
}

async function loadOcrWorker() {
  if (!workerPromise) {
    workerPromise = createWorker("por", 1, {
      workerPath: assetUrl("tesseract-worker.min.js"),
      corePath: assetUrl(""),
      langPath: assetUrl(""),
      gzip: false,
      workerBlobURL: false,
      cacheMethod: "none",
      logger: () => undefined,
    });
  }
  return workerPromise;
}

export async function recognizePdfPage(imageDataUrl: string): Promise<OcrResult> {
  if (!imageDataUrl) {
    return { text: "", confidence: 0, warning: "A página não possui evidência visual disponível para OCR." };
  }

  try {
    const worker = await loadOcrWorker();
    const result = await worker.recognize(imageDataUrl);
    const text = result.data.text.trim();
    const confidence = Number(result.data.confidence ?? 0);
    return {
      text,
      confidence,
      warning: confidence < 70
        ? "OCR com baixa confiança. Conferir o texto reconhecido na imagem original."
        : "Conteúdo obtido por OCR local. Conferir a transcrição na imagem original.",
    };
  } catch {
    return {
      text: "",
      confidence: 0,
      warning: "Não foi possível concluir o OCR local desta página. Conferir a imagem original manualmente.",
    };
  }
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise;
    await worker.terminate();
    workerPromise = null;
  }
}
