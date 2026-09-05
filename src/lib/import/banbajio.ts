import ExcelJS from "exceljs";
import type { NormalizedRow, ParsedStatement } from "./types";
import type { TxDirection } from "@/generated/prisma/enums";
import { classifyTransaction } from "./classify";

/** Carga un Workbook desde un Buffer de Node (exceljs tipa su propio Buffer). */
async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  return wb;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const obj = value as { text?: string; result?: unknown; richText?: { text: string }[] };
    if (obj.richText) return obj.richText.map((t) => t.text).join("").trim();
    if (obj.text) return obj.text.trim();
    if (obj.result != null) return String(obj.result).trim();
  }
  return String(value).trim();
}

function cellNumber(value: ExcelJS.CellValue): number | undefined {
  if (value == null || value === "") return undefined;
  if (typeof value === "number") return value;
  const n = Number(cellText(value).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

/** Convierte un valor de celda de fecha (Date o texto) a Date UTC a medianoche. */
function cellDate(value: ExcelJS.CellValue): Date | null {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const s = cellText(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const d = new Date(s);
  return isNaN(d.getTime())
    ? null
    : new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Extrae "HH:MM" de una celda de hora (Date o texto datetime). */
function cellTime(value: ExcelJS.CellValue): string | undefined {
  if (value instanceof Date) {
    const hh = String(value.getUTCHours()).padStart(2, "0");
    const mm = String(value.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  const s = cellText(value);
  const m = /(\d{2}):(\d{2})(?::\d{2})?/.exec(s);
  return m ? `${m[1]}:${m[2]}` : undefined;
}

export async function isBanBajioXlsx(buffer: Buffer): Promise<boolean> {
  try {
    const wb = await loadWorkbook(buffer);
    const ws = wb.worksheets[0];
    if (!ws) return false;
    let hint = false;
    ws.eachRow({ includeEmpty: false }, (row) => {
      const joined = (row.values as ExcelJS.CellValue[])
        .map((v) => cellText(v))
        .join(" ")
        .toLowerCase();
      if (joined.includes("fecha movimiento") || joined.includes("banbajio")) hint = true;
    });
    return hint;
  } catch {
    return false;
  }
}

export async function parseBanBajioXlsx(buffer: Buffer): Promise<ParsedStatement> {
  const wb = await loadWorkbook(buffer);
  const ws =
    wb.getWorksheet("ConsultaMovimientos") ?? wb.worksheets[0];

  const rows: NormalizedRow[] = [];
  let totalCargos = 0;
  let totalAbonos = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  if (!ws) return { bank: "BANBAJIO", rows, totalCargos: 0, totalAbonos: 0 };

  // 1) Localizar la fila de encabezados de movimientos, y de paso el número
  // de cliente del bloque "Datos Generales" que trae arriba — el archivo no
  // dice a qué negocio pertenece, pero ese número sí identifica la cuenta.
  let headerRowNum = -1;
  let detectedAccountNumber: string | undefined;
  const colIndex: Record<string, number> = {};
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = row.values as ExcelJS.CellValue[];
    const texts = values.map((v) => cellText(v).toLowerCase());

    if (headerRowNum === -1) {
      const clienteIdx = texts.findIndex((t) => t === "número cliente" || t === "numero cliente");
      if (clienteIdx !== -1) {
        detectedAccountNumber = texts.slice(clienteIdx + 1).find((t) => t) || undefined;
      }
    }

    if (headerRowNum !== -1) return;
    if (texts.some((t) => t === "fecha movimiento") && texts.some((t) => t.includes("saldo"))) {
      headerRowNum = rowNumber;
      texts.forEach((t, i) => {
        if (t) colIndex[t] = i;
      });
    }
  });

  if (headerRowNum === -1) {
    return { bank: "BANBAJIO", rows, totalCargos: 0, totalAbonos: 0, detectedAccountNumber };
  }

  const c = {
    num: colIndex["#"] ?? 1,
    fecha: colIndex["fecha movimiento"],
    hora: colIndex["hora"],
    recibo: colIndex["recibo"],
    desc: colIndex["descripción"] ?? colIndex["descripcion"],
    cargos: colIndex["cargos"],
    abonos: colIndex["abonos"],
    saldo: colIndex["saldo"],
  };

  // 2) Leer filas de datos hasta que el "#" deje de ser numérico o aparezca "Nota:".
  const lastRow = ws.rowCount;
  for (let n = headerRowNum + 1; n <= lastRow; n++) {
    const row = ws.getRow(n);
    const values = row.values as ExcelJS.CellValue[];
    const numText = cellText(values[c.num]);
    const firstCell = cellText(values[1]).toLowerCase();
    if (firstCell.startsWith("nota")) break;
    if (!/^\d+$/.test(numText)) continue;

    const date = cellDate(values[c.fecha]);
    if (!date) continue;

    const description = cellText(values[c.desc]);
    const cargos = cellNumber(values[c.cargos]) ?? 0;
    const abonos = cellNumber(values[c.abonos]) ?? 0;

    let direction: TxDirection;
    let amount: number;
    if (abonos > 0) {
      direction = "ABONO";
      amount = abonos;
    } else if (cargos > 0) {
      direction = "CARGO";
      amount = cargos;
    } else {
      direction = "CARGO";
      amount = 0;
    }

    if (direction === "ABONO") totalAbonos += amount;
    else totalCargos += amount;
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    rows.push({
      date,
      time: c.hora ? cellTime(values[c.hora]) : undefined,
      description,
      direction,
      amount,
      balance: c.saldo ? cellNumber(values[c.saldo]) : undefined,
      reference: c.recibo ? cellText(values[c.recibo]) || undefined : undefined,
      category: classifyTransaction(description, direction),
      raw: {
        recibo: c.recibo ? cellText(values[c.recibo]) : "",
        cargos,
        abonos,
      },
    });
  }

  return {
    bank: "BANBAJIO",
    rows,
    periodStart: minDate ?? undefined,
    periodEnd: maxDate ?? undefined,
    totalCargos: Math.round(totalCargos * 100) / 100,
    totalAbonos: Math.round(totalAbonos * 100) / 100,
    detectedAccountNumber,
  };
}
