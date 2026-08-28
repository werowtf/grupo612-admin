import type { CorteExtraction } from "./types";
import { parseCorteExcel } from "./excel";
import { parseCorteImage } from "./ocr";

export class CorteImportError extends Error {}

export type { CorteDraft, CorteExtraction } from "./types";
export { extractCorteFromLines } from "./extract";
export { parseCorteExcel } from "./excel";
export { parseCorteImage } from "./ocr";

const IMAGE_EXT = /\.(jpe?g|png|webp|bmp|tiff?)$/i;
const EXCEL_EXT = /\.(xlsx|xls)$/i;
const PDF_EXT = /\.pdf$/i;

/**
 * El PDF que genera Soft Restaurant trae el ticket como texto, así que se lee
 * en local: gratis, instantáneo y sin depender de un servicio externo. Solo si
 * el PDF viene escaneado (una foto dentro de un PDF, sin texto) se recurre al
 * modelo de visión.
 */
export async function parseCortePdf(buffer: Buffer): Promise<CorteExtraction> {
  const { extractPdfLines } = await import("./pdf");
  const lines = extractPdfLines(buffer);

  if (lines) {
    const { extractCorteFromLines } = await import("./extract");
    const { validarCuadres } = await import("./validate");
    const { detectVenueFromText } = await import("./venue-detect");
    const { draft, detected } = extractCorteFromLines(lines);
    const rawText = lines.join("\n");
    return {
      source: "OCR",
      draft,
      rawText,
      detected,
      detectedVenueName: detectVenueFromText(rawText),
      warnings: validarCuadres(draft),
    };
  }

  const { parseCorteVision, resolveMediaType } = await import("./vision");
  return parseCorteVision(buffer, resolveMediaType("archivo.pdf"));
}

/** Detecta el tipo de archivo y extrae el borrador del corte. */
export async function parseCorteFile(
  fileName: string,
  buffer: Buffer,
): Promise<CorteExtraction> {
  if (EXCEL_EXT.test(fileName)) return parseCorteExcel(buffer);
  if (PDF_EXT.test(fileName)) return parseCortePdf(buffer);
  if (IMAGE_EXT.test(fileName)) return parseCorteImage(buffer);
  throw new CorteImportError(
    "Formato no soportado. Sube un Excel (.xlsx) de Soft Restaurant, un PDF, o una foto (.jpg/.png) del ticket.",
  );
}
