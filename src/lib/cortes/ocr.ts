import type { CorteExtraction } from "./types";
import { extractCorteFromLines } from "./extract";
import { createOcrWorker } from "@/lib/ocr-worker";

/**
 * Lee un corte de caja desde una imagen (foto del ticket) usando OCR (Tesseract,
 * español). El texto reconocido se mapea a campos con el extractor por etiquetas.
 * Es "mejor esfuerzo": la calidad depende de la foto; el usuario revisa/edita.
 */
export async function parseCorteImage(buffer: Buffer): Promise<CorteExtraction> {
  const worker = await createOcrWorker("spa");
  try {
    const { data } = await worker.recognize(buffer);
    const text = data.text ?? "";
    const { draft, detected } = extractCorteFromLines(text.split(/\r?\n/));
    return { source: "OCR", draft, rawText: text, detected };
  } finally {
    await worker.terminate();
  }
}
