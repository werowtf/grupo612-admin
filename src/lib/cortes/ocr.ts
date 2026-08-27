import type { CorteExtraction } from "./types";
import { extractCorteFromLines } from "./extract";
import { detectVenueFromText } from "./venue-detect";
import { validarCuadres } from "./validate";
import { createOcrWorker, type OcrProgress } from "@/lib/ocr-worker";

/**
 * Lee un corte de caja desde una imagen (foto del ticket) usando OCR (Tesseract,
 * español). El texto reconocido se mapea a campos con el extractor por etiquetas.
 *
 * Es el camino de respaldo: solo acierta con una foto limpia de un único
 * ticket, de frente y bien iluminada. Cuando hay credencial configurada se usa
 * {@link import("./vision").parseCorteVision} en su lugar, que sí resuelve las
 * fotos reales de caja (varios documentos, ángulo, sombras).
 */
export async function parseCorteImage(
  buffer: Buffer,
  onProgress?: (p: OcrProgress) => void,
): Promise<CorteExtraction> {
  const worker = await createOcrWorker("spa", onProgress);
  try {
    const { data } = await worker.recognize(buffer);
    const text = data.text ?? "";
    const { draft, detected } = extractCorteFromLines(text.split(/\r?\n/));
    const detectedVenueName = detectVenueFromText(text);
    return {
      source: "OCR",
      draft,
      rawText: text,
      detected,
      detectedVenueName,
      warnings: validarCuadres(draft),
    };
  } finally {
    await worker.terminate();
  }
}
