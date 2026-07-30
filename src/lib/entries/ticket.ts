import { createOcrWorker } from "@/lib/ocr-worker";

export interface TicketDraft {
  amount?: number;
  date?: string; // ISO yyyy-mm-dd
  folio?: string;
  rfc?: string;
  supplier?: string;
}

export interface TicketExtraction {
  draft: TicketDraft;
  rawText: string;
  detected: (keyof TicketDraft)[];
}

function moneyValues(line: string): number[] {
  const out: number[] = [];
  const re = /\$?\s?(-?\d[\d,]*\.\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

function parseDate(text: string): string | undefined {
  const m = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(text);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Extrae los datos clave de un ticket de compra a partir del texto OCR. */
export function extractTicket(text: string): {
  draft: TicketDraft;
  detected: (keyof TicketDraft)[];
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const upper = text.toUpperCase();
  const draft: TicketDraft = {};
  const detected = new Set<keyof TicketDraft>();

  // Monto: preferimos la línea con "TOTAL" (no SUBTOTAL); si no, el mayor monto.
  const totalCandidates: number[] = [];
  const allMoney: number[] = [];
  for (const line of lines) {
    const u = line.toUpperCase();
    const vals = moneyValues(line);
    allMoney.push(...vals);
    if (/TOTAL/.test(u) && !/SUBTOTAL/.test(u) && vals.length) {
      totalCandidates.push(Math.max(...vals));
    }
  }
  const amount =
    totalCandidates.length > 0
      ? Math.max(...totalCandidates)
      : allMoney.length
        ? Math.max(...allMoney)
        : undefined;
  if (amount !== undefined) {
    draft.amount = amount;
    detected.add("amount");
  }

  const date = parseDate(text);
  if (date) {
    draft.date = date;
    detected.add("date");
  }

  const rfc = /\b([A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3})\b/.exec(upper)?.[1];
  if (rfc) {
    draft.rfc = rfc;
    detected.add("rfc");
  }

  // Palabra completa (evita "NO" dentro de otras palabras) y exige un dígito en el folio.
  const folio = /\b(?:FOLIO|TICKET|NOTA|FACTURA|N[º°])\b[\s:#.]*([A-Z0-9][A-Z0-9\-]*\d[A-Z0-9\-]*)/.exec(
    upper,
  )?.[1];
  if (folio) {
    draft.folio = folio;
    detected.add("folio");
  }

  // Proveedor: primera línea "de texto" (nombre del comercio).
  const nameLine = lines.find((l) => /[A-Za-zÁÉÍÓÚÑ]{3,}/.test(l) && !/TICKET|FOLIO/i.test(l));
  if (nameLine) {
    draft.supplier = nameLine.slice(0, 60);
    detected.add("supplier");
  }

  return { draft, detected: [...detected] };
}

export async function parseTicketImage(
  buffer: Buffer,
  onProgress?: (p: { status: string; progress: number }) => void,
): Promise<TicketExtraction> {
  const worker = await createOcrWorker("spa", onProgress);
  try {
    const { data } = await worker.recognize(buffer);
    const rawText = data.text ?? "";
    const { draft, detected } = extractTicket(rawText);
    return { draft, rawText, detected };
  } finally {
    await worker.terminate();
  }
}
