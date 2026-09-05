import type { ParsedStatement } from "./types";
import { isSantanderCsv, parseSantanderCsv } from "./santander";
import { isBanBajioXlsx, parseBanBajioXlsx } from "./banbajio";

export class ImportError extends Error {}

export type { NormalizedRow, ParsedStatement } from "./types";
export { computeDedupeHash } from "./dedupe";
export { classifyTransaction, classifyWithMatch, normalizeConcept } from "./classify";

/**
 * Detecta el banco por extensión + contenido y devuelve el estado de cuenta
 * normalizado. Lanza {@link ImportError} si el formato no se reconoce.
 */
export async function parseStatement(
  fileName: string,
  buffer: Buffer,
): Promise<ParsedStatement> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv")) {
    const text = buffer.toString("latin1");
    if (isSantanderCsv(text)) return parseSantanderCsv(buffer);
    throw new ImportError(
      "El CSV no coincide con el formato de estado de cuenta Santander esperado.",
    );
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    if (await isBanBajioXlsx(buffer)) return parseBanBajioXlsx(buffer);
    throw new ImportError(
      "El Excel no coincide con el formato de estado de cuenta BanBajío esperado.",
    );
  }

  throw new ImportError(
    "Formato no soportado. Sube un CSV de Santander o un Excel (.xlsx) de BanBajío.",
  );
}
