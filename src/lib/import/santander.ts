import type { NormalizedRow, ParsedStatement } from "./types";
import type { TxDirection } from "@/generated/prisma/enums";
import { classifyTransaction } from "./classify";
import { parseCsv } from "./csv";

/** Quita comillas simples sueltas y espacios sobrantes de un campo Santander. */
function clean(value: string | undefined): string {
  return (value ?? "").replace(/^'+/, "").replace(/'+$/, "").trim();
}

/** Fecha Santander en formato DDMMYYYY (p.ej. "01062026") → Date en UTC. */
function parseSantanderDate(value: string): Date | null {
  const v = clean(value);
  const m = /^(\d{2})(\d{2})(\d{4})$/.exec(v);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

function parseAmount(value: string): number {
  const n = Number(clean(value).replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Detecta si un buffer/texto corresponde al formato Santander. */
export function isSantanderCsv(text: string): boolean {
  const firstLine = text.split(/\r?\n/, 1)[0]?.toLowerCase() ?? "";
  return (
    firstLine.includes("cargo/abono") &&
    firstLine.includes("saldo") &&
    firstLine.includes("clave de rastreo")
  );
}

export function parseSantanderCsv(buffer: Buffer): ParsedStatement {
  // El export de Santander viene en latin-1.
  const text = buffer.toString("latin1");
  const table = parseCsv(text);
  if (table.length < 2) {
    return emptyStatement();
  }

  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);

  const idx = {
    cuenta: col("cuenta"),
    fecha: col("fecha"),
    hora: col("hora"),
    descripcion: col("descripcion"),
    cargoAbono: col("cargo/abono"),
    importe: col("importe"),
    saldo: col("saldo"),
    referencia: col("referencia"),
    concepto: col("concepto"),
    nombreBen: col("nombre beneficiario"),
    nombreOrd: col("nombre ordenante"),
    rfcBen: col("rfc beneficiario"),
    rfcOrd: col("rfc ordenante"),
    claveRastreo: col("clave de rastreo"),
    descLarga: col("descripcion larga"),
  };

  const rows: NormalizedRow[] = [];
  let totalCargos = 0;
  let totalAbonos = 0;
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  for (let i = 1; i < table.length; i++) {
    const r = table[i];
    const date = parseSantanderDate(r[idx.fecha]);
    if (!date) continue;

    const description = clean(r[idx.descripcion]);
    const sign = clean(r[idx.cargoAbono]);
    const direction: TxDirection = sign === "+" ? "ABONO" : "CARGO";
    const amount = Math.abs(parseAmount(r[idx.importe]));
    const balanceRaw = clean(r[idx.saldo]);
    const balance = balanceRaw ? parseAmount(r[idx.saldo]) : undefined;

    if (direction === "ABONO") totalAbonos += amount;
    else totalCargos += amount;
    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    rows.push({
      date,
      time: clean(r[idx.hora]) || undefined,
      description,
      descriptionLong: clean(r[idx.descLarga]) || undefined,
      direction,
      amount,
      balance,
      reference: clean(r[idx.referencia]) || undefined,
      concept: clean(r[idx.concepto]) || undefined,
      category: classifyTransaction(description, direction),
      counterpartyName:
        clean(r[idx.nombreBen]) || clean(r[idx.nombreOrd]) || undefined,
      counterpartyRfc: clean(r[idx.rfcBen]) || clean(r[idx.rfcOrd]) || undefined,
      trackingKey: clean(r[idx.claveRastreo]) || undefined,
      raw: buildRaw(header, r),
    });
  }

  // La cuenta viene en cada renglón, idéntica; con la primera fila basta.
  const detectedAccountNumber = idx.cuenta >= 0 ? clean(table[1]?.[idx.cuenta]) || undefined : undefined;

  return {
    bank: "SANTANDER",
    rows,
    periodStart: minDate ?? undefined,
    periodEnd: maxDate ?? undefined,
    totalCargos: round2(totalCargos),
    totalAbonos: round2(totalAbonos),
    detectedAccountNumber,
  };
}

function buildRaw(header: string[], row: string[]): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  header.forEach((h, i) => {
    const v = clean(row[i]);
    if (v) raw[h] = v;
  });
  return raw;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function emptyStatement(): ParsedStatement {
  return {
    bank: "SANTANDER",
    rows: [],
    totalCargos: 0,
    totalAbonos: 0,
  };
}
