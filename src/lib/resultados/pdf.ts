import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { PAY_COLUMNS, type StatementLine, type Statement } from "./statement";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export type PdfOrientation = "portrait" | "landscape";

interface Layout {
  w: number;
  h: number;
  /** Anchos: concepto, 5 formas de pago, total y % (suman w - 2 * MARGIN). */
  cols: number[];
  font: number;
  headFont: number;
  pctFont: number;
  /** Alto de renglón preferido y mínimo (se ajusta para que quepa en una página). */
  rowH: number;
  minRowH: number;
  kpiValue: number;
}

const MARGIN = 36;

const LAYOUTS: Record<PdfOrientation, Layout> = {
  // A4 vertical: 595 x 842
  portrait: {
    w: 595,
    h: 842,
    cols: [128, 56, 56, 56, 60, 60, 70, 37],
    font: 6.6,
    headFont: 5.5,
    pctFont: 6,
    rowH: 13.5,
    minRowH: 9,
    kpiValue: 11,
  },
  // A4 horizontal: 842 x 595
  landscape: {
    w: 842,
    h: 595,
    cols: [196, 78, 78, 78, 78, 78, 84, 100],
    font: 7.6,
    headFont: 6.8,
    pctFont: 7,
    rowH: 13.5,
    minRowH: 12,
    kpiValue: 12,
  },
};

const INK = rgb(0.1, 0.1, 0.1);
const GREEN = rgb(0.18, 0.5, 0.4);
const GRAY = rgb(0.4, 0.4, 0.4);
const RED = rgb(0.72, 0.15, 0.15);

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
// La fuente estándar del PDF no tiene el signo "−" de Intl: se usa el guion normal.
const money = (n: number) => (Math.abs(n) < 0.005 ? "—" : fmt.format(n).replace(/−/g, "-"));

const NOTES = [
  "Ventas: venta diaria del mes (la tarjeta incluye las propinas con tarjeta). Gastos: egresos del mes por categoria y forma de pago.",
  "Nomina admin = comision del mes (venta total x porcentaje). Comisiones bancarias = movimientos bancarios de categoria Comision.",
  "Impuestos = estimado de 19.181% sobre la utilidad antes de impuestos. % costo de venta: cocina y barra contra la venta sin impuesto con IVA;",
  "general contra la venta total.",
];
const NOTE_H = 8.5;

/** Dibuja el estado de resultados en PDF (A4), con las mismas líneas que la pantalla. */
export async function renderStatementPdf(opts: {
  venueName: string;
  year: number;
  month: number;
  statement: Statement;
  /** Logo del negocio en PNG (opcional). */
  logoPng?: Uint8Array | null;
  /** Por defecto vertical: cabe en una sola hoja. */
  orientation?: PdfOrientation;
  generatedAt?: Date;
}): Promise<Uint8Array> {
  const { venueName, year, month, statement } = opts;
  const { lines, kpis } = statement;
  const L = LAYOUTS[opts.orientation ?? "portrait"];
  const generatedAt = opts.generatedAt ?? new Date();
  const contentW = L.w - 2 * MARGIN;

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page: PDFPage = doc.addPage([L.w, L.h]);
  let y = L.h - MARGIN;

  const text = (s: string, x: number, yy: number, f: PDFFont, size: number, color = INK) =>
    page.drawText(s, { x, y: yy, size, font: f, color });
  const right = (s: string, xRight: number, yy: number, f: PDFFont, size: number, color = INK) =>
    text(s, xRight - f.widthOfTextAtSize(s, size), yy, f, size, color);

  // ── Encabezado del documento ───────────────────────────────
  text("Estado de resultados", MARGIN, y - 14, bold, 16, GREEN);
  text(`${venueName} · ${MONTHS[month - 1]} ${year}`, MARGIN, y - 30, font, 10.5);
  text(
    `Generado: ${generatedAt.toLocaleDateString("es-MX", { timeZone: "America/Mazatlan" })}`,
    MARGIN,
    y - 43,
    font,
    7.5,
    GRAY,
  );
  if (opts.logoPng) {
    // Logo del negocio arriba a la derecha (alto máximo 46, ancho máximo 150).
    const logo = await doc.embedPng(opts.logoPng);
    const scale = Math.min(46 / logo.height, 150 / logo.width);
    const w = logo.width * scale;
    const h = logo.height * scale;
    page.drawImage(logo, { x: L.w - MARGIN - w, y: y - h + 2, width: w, height: h });
  }

  // ── Resumen ────────────────────────────────────────────────
  y -= 62;
  const kpiItems: [string, number][] = [
    ["Ingreso total", kpis.ingresoTotal],
    ["Utilidad bruta", kpis.utilidadBruta],
    ["Utilidad operativa", kpis.utilidadOperativa],
    ["Utilidad neta", kpis.utilidadNeta],
  ];
  const kpiW = contentW / 4;
  kpiItems.forEach(([label, value], idx) => {
    const x = MARGIN + idx * kpiW;
    text(label.toUpperCase(), x, y, font, 6.4, GRAY);
    text(money(value), x, y - 13, bold, L.kpiValue, value < 0 ? RED : INK);
  });
  if (kpis.pctUtilidad != null) {
    text(`${(kpis.pctUtilidad * 100).toFixed(2)}% sobre la venta`, MARGIN + 3 * kpiW, y - 23, font, 6.4, GRAY);
  }
  y -= 40;

  // ── Alto de renglón: el preferido, o el que haga caber todo en una hoja ──
  const headerH = L.rowH + 2;
  const notesH = NOTES.length * NOTE_H + 8;
  const room = y - headerH - notesH - MARGIN;
  const rowH = Math.max(L.minRowH, Math.min(L.rowH, room / lines.length));

  const drawHeader = () => {
    page.drawRectangle({ x: MARGIN, y: y - 4, width: contentW, height: headerH, color: rgb(0.9, 0.95, 0.93) });
    let x = MARGIN;
    const headers = ["CONCEPTO", ...PAY_COLUMNS.map((c) => c.toUpperCase()), "TOTAL", "%"];
    headers.forEach((h, idx) => {
      if (idx === 0) text(h, x + 4, y, bold, L.headFont, GREEN);
      else right(h, x + L.cols[idx] - 3, y, bold, L.headFont, GREEN);
      x += L.cols[idx];
    });
    y -= headerH;
  };

  const newPage = () => {
    page = doc.addPage([L.w, L.h]);
    y = L.h - MARGIN;
    drawHeader();
  };

  drawHeader();

  const drawLine = (l: StatementLine) => {
    if (y < MARGIN + rowH) newPage();

    if (l.kind === "section") {
      page.drawRectangle({ x: MARGIN, y: y - 3.5, width: contentW, height: rowH, color: rgb(0.95, 0.97, 0.96) });
      text(l.label.toUpperCase(), MARGIN + 4, y, bold, L.font - 0.4, GREEN);
      y -= rowH;
      return;
    }

    const strong = l.kind !== "row";
    const f = strong ? bold : font;
    if (l.kind === "result") {
      page.drawRectangle({ x: MARGIN, y: y - 3.5, width: contentW, height: rowH, color: rgb(0.89, 0.95, 0.92) });
    } else if (l.kind === "total" || l.kind === "subtotal") {
      page.drawLine({
        start: { x: MARGIN, y: y + rowH - 3.5 },
        end: { x: L.w - MARGIN, y: y + rowH - 3.5 },
        thickness: 0.4,
        color: rgb(0.7, 0.7, 0.7),
      });
    }

    let x = MARGIN;
    text(l.label, x + (l.kind === "row" ? 9 : 4), y, f, L.font);
    x += L.cols[0];
    PAY_COLUMNS.forEach((_, idx) => {
      if (l.cells) {
        const v = l.cells[idx];
        right(money(v), x + L.cols[idx + 1] - 3, y, f, L.font, v < 0 ? RED : v === 0 ? GRAY : INK);
      }
      x += L.cols[idx + 1];
    });
    if (l.total != null) {
      right(money(l.total), x + L.cols[6] - 3, y, bold, L.font, l.total < 0 && l.kind === "result" ? RED : INK);
    }
    x += L.cols[6];
    if (l.pct != null) right(`${(l.pct * 100).toFixed(2)}%`, x + L.cols[7] - 3, y, font, L.pctFont, GRAY);
    y -= rowH;
  };

  for (const l of lines) drawLine(l);

  // ── Notas al pie ───────────────────────────────────────────
  y -= 8;
  if (y < MARGIN + NOTES.length * NOTE_H) newPage();
  for (const n of NOTES) {
    text(n, MARGIN, y, font, 5.8, GRAY);
    y -= NOTE_H;
  }

  return doc.save();
}
