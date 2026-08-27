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

/** Detecta el tipo de archivo y extrae el borrador del corte. */
export async function parseCorteFile(
  fileName: string,
  buffer: Buffer,
): Promise<CorteExtraction> {
  if (EXCEL_EXT.test(fileName)) return parseCorteExcel(buffer);
  if (PDF_EXT.test(fileName)) {
    // Los PDF solo se leen con el modelo de visión; Tesseract no los abre.
    const { parseCorteVision, resolveMediaType } = await import("./vision");
    return parseCorteVision(buffer, resolveMediaType(fileName));
  }
  if (IMAGE_EXT.test(fileName)) return parseCorteImage(buffer);
  throw new CorteImportError(
    "Formato no soportado. Sube un Excel (.xlsx) de Soft Restaurant, un PDF, o una foto (.jpg/.png) del ticket.",
  );
}
