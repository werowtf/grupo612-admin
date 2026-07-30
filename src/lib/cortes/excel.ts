import ExcelJS from "exceljs";
import type { CorteExtraction } from "./types";
import { extractCorteFromLines } from "./extract";

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toLocaleDateString("es-MX");
  if (typeof value === "object") {
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (obj.text) return obj.text.trim();
    if (obj.result != null) return String(obj.result).trim();
  }
  return String(value).trim();
}

/**
 * Lee un Excel de corte de caja (p.ej. export de Soft Restaurant). Aplana cada
 * fila a una línea de texto y aplica el extractor por etiquetas. Resistente a
 * variaciones de layout; el resultado se revisa/edita antes de guardar.
 */
export async function parseCorteExcel(buffer: Buffer): Promise<CorteExtraction> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);

  const lines: string[] = [];
  const rawRows: string[][] = [];

  for (const ws of wb.worksheets) {
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells = (row.values as ExcelJS.CellValue[])
        .map((v) => cellText(v))
        .filter((t) => t !== "");
      if (cells.length === 0) return;
      rawRows.push(cells);
      // Une celdas con separación para que etiqueta y valor queden en la misma línea.
      lines.push(cells.join("  "));
    });
  }

  const { draft, detected } = extractCorteFromLines(lines);

  return {
    source: "EXCEL",
    draft,
    raw: { rows: rawRows.slice(0, 200) },
    detected,
  };
}
