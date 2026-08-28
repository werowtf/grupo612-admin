import ExcelJS from "exceljs";
import type { CorteDraft, CorteExtraction } from "./types";
import { validarCuadres } from "./validate";

/**
 * Lee el Excel de corte de caja que exporta Soft Restaurant.
 *
 * El resumen NO es una lista de renglones: son varios bloques puestos lado a
 * lado, cada uno con su encabezado y con la etiqueta en una celda y el valor en
 * la de la derecha. Por eso se lee por celdas y no aplanando la fila a texto:
 * aplanándola, "NORMALES: 26" y "+ EFECTIVO INICIAL: 5000" caen en la misma
 * línea y la etiqueta de un bloque termina emparejada con el número de otro.
 *
 * Además "VISA" y "MASTERCARD" aparecen en dos bloques (ventas y propinas), así
 * que hay que saber bajo qué encabezado va cada columna para no confundirlos.
 */

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

function norm(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Número de una celda; acepta "1,234.50", "$1,234.50" y negativos. */
function cellNumber(raw: string): number | undefined {
  const t = raw.replace(/[$\s,]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(t)) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

type Section =
  | "cuentas"
  | "caja"
  | "pagoVentas"
  | "pagoPropina"
  | "descuentos"
  | "ventas"
  | "otro";

const SECTION_HEADERS: { test: RegExp; section: Section }[] = [
  { test: /^CUENTAS$/, section: "cuentas" },
  { test: /^CAJA$/, section: "caja" },
  { test: /FORMA DE PAGO DE VENTAS/, section: "pagoVentas" },
  { test: /FORMA DE PAGO DE PROPINA/, section: "pagoPropina" },
  { test: /DESCUENTOS Y CORTESIAS/, section: "descuentos" },
  { test: /VENTAS \(NO INCLUYE IMPUESTOS\)/, section: "ventas" },
  // Bloques que no se capturan, pero que deben cortar la sección anterior para
  // que sus etiquetas no se lean como si siguieran en ella.
  { test: /FORMA DE PAGO CTAS POR COBRAR|FORMA DE PAGO POR AGRUPADOR|^FACTURAS$/, section: "otro" },
];

interface Rule {
  section: Section;
  test: RegExp;
  field: keyof CorteDraft | "__sobrante" | "__faltante";
  int?: boolean;
}

// Dentro de cada sección gana la primera regla que coincide, así que las
// etiquetas más específicas van antes que las que son prefijo de otras.
const RULES: Rule[] = [
  { section: "cuentas", test: /^NORMALES/, field: "cuentasNormales", int: true },
  { section: "cuentas", test: /^CANCELADAS/, field: "cuentasCanceladas", int: true },
  { section: "cuentas", test: /^CUENTA PROMEDIO/, field: "cuentaPromedio" },
  { section: "cuentas", test: /^COMENSALES/, field: "comensales", int: true },
  { section: "cuentas", test: /^PROPINAS/, field: "totalPropinas" },
  { section: "cuentas", test: /^FOLIO INICIAL/, field: "folioInicial", int: true },
  { section: "cuentas", test: /^FOLIO FINAL/, field: "folioFinal", int: true },

  { section: "caja", test: /EFECTIVO INICIAL/, field: "efectivoInicial" },
  { section: "caja", test: /DEPOSITO EF/, field: "depositos" },
  { section: "caja", test: /RETIROS EF/, field: "retiros" },
  { section: "caja", test: /EFECTIVO FINAL/, field: "efectivoDeclarado" },
  { section: "caja", test: /^DECLARADO/, field: "totalFormasPago" },
  { section: "caja", test: /^SOBRANTE/, field: "__sobrante" },
  { section: "caja", test: /^FALTANTE/, field: "__faltante" },

  { section: "pagoVentas", test: /^EFECTIVO/, field: "pagoEfectivo" },
  { section: "pagoVentas", test: /^VISA/, field: "pagoVisa" },
  { section: "pagoVentas", test: /^MASTER ?CARD/, field: "pagoMastercard" },
  { section: "pagoVentas", test: /^AMERICAN EXPRE/, field: "pagoAmex" },
  { section: "pagoVentas", test: /^VALES/, field: "pagoVales" },
  { section: "pagoVentas", test: /^OTROS|^CREDITO/, field: "pagoOtros" },

  { section: "pagoPropina", test: /^EFECTIVO/, field: "propinaEfectivo" },
  { section: "pagoPropina", test: /^VISA/, field: "propinaVisa" },
  { section: "pagoPropina", test: /^MASTER ?CARD/, field: "propinaMastercard" },
  { section: "pagoPropina", test: /^AMERICAN EXPRE/, field: "propinaAmex" },

  // En este bloque, "TOTAL:" es descuentos + cortesías, que es lo que el ticket
  // resta como "-DESCUENTOS".
  { section: "descuentos", test: /^TOTAL:?$/, field: "descuentos" },

  { section: "ventas", test: /^ALIMENTOS/, field: "ventaAlimentos" },
  { section: "ventas", test: /^BEBIDAS/, field: "ventaBebidas" },
  { section: "ventas", test: /^OTROS/, field: "ventaOtros" },
  { section: "ventas", test: /VENTAS SIN IMP\.? SIN DESC/, field: "subtotal" },
  { section: "ventas", test: /^VENTAS SIN IMP/, field: "ventaNeta" },
  { section: "ventas", test: /^IMPUESTO/, field: "iva" },
  { section: "ventas", test: /VENTA CON IMP/, field: "totalVenta" },
];

interface Grid {
  rows: { col: number; text: string }[][];
}

function buildGrid(wb: ExcelJS.Workbook): { grid: Grid; allText: string[] } {
  const rows: Grid["rows"] = [];
  const allText: string[] = [];
  for (const ws of wb.worksheets) {
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: { col: number; text: string }[] = [];
      row.eachCell({ includeEmpty: false }, (cell, col) => {
        const text = cellText(cell.value);
        if (text) cells.push({ col, text });
      });
      if (cells.length) {
        rows.push(cells);
        allText.push(cells.map((c) => c.text).join("  "));
      }
    });
  }
  return { grid: { rows }, allText };
}

/** Valor del renglón: el número embebido tras ":" o la celda numérica más cercana a la derecha. */
function valueFor(
  cells: { col: number; text: string }[],
  idx: number,
): number | undefined {
  const { text, col } = cells[idx];
  const trailing = /:\s*(-?[\d,]+(?:\.\d+)?)\s*$/.exec(text);
  if (trailing) {
    const n = cellNumber(trailing[1]);
    if (n !== undefined) return n;
  }
  // Se limita la búsqueda a pocas columnas para no cruzar al bloque de al lado.
  for (let j = idx + 1; j < cells.length; j++) {
    if (cells[j].col - col > 3) break;
    const n = cellNumber(cells[j].text);
    if (n !== undefined) return n;
  }
  return undefined;
}

function parseDate(text: string): string | undefined {
  const m = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(text);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export async function parseCorteExcel(buffer: Buffer): Promise<CorteExtraction> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const { grid, allText } = buildGrid(wb);

  const draft: CorteDraft = {};
  const detected = new Set<keyof CorteDraft>();
  const set = (field: keyof CorteDraft, value: number | string | undefined) => {
    if (value === undefined || draft[field] !== undefined) return;
    // @ts-expect-error asignación dinámica acotada por las reglas
    draft[field] = value;
    detected.add(field);
  };

  // Encabezado: fecha y folio del corte viven en las primeras filas, como texto.
  for (const line of allText.slice(0, 12)) {
    const n = norm(line);
    if (/CORTE Z|CORTE DE CAJA/.test(n)) set("date", parseDate(n));
    const folio = /FOLIO CORTE Z:?\s*(\d+)/.exec(n);
    if (folio) set("folioCorteZ", folio[1]);
  }

  // La sección aplica por columna: se hereda del encabezado que quedó arriba.
  const sectionByCol = new Map<number, Section>();
  let sobrante: number | undefined;
  let faltante: number | undefined;

  for (const cells of grid.rows) {
    // 1) ¿esta fila trae encabezados de bloque? Una misma fila puede abrir un
    // bloque en una columna y traer una etiqueta con valor en otra, así que se
    // marcan solo las celdas de encabezado en vez de saltar la fila entera.
    const headerCols = new Set<number>();
    for (const { col, text } of cells) {
      const n = norm(text);
      const hit = SECTION_HEADERS.find((h) => h.test.test(n));
      if (hit) {
        sectionByCol.set(col, hit.section);
        headerCols.add(col);
      }
    }

    // 2) etiquetas dentro de la sección de su columna
    for (let i = 0; i < cells.length; i++) {
      if (headerCols.has(cells[i].col)) continue;
      const section = sectionByCol.get(cells[i].col);
      if (!section || section === "otro") continue;
      const n = norm(cells[i].text);
      const rule = RULES.find((r) => r.section === section && r.test.test(n));
      if (!rule) continue;

      const value = valueFor(cells, i);
      if (value === undefined) continue;

      if (rule.field === "__sobrante") sobrante = value;
      else if (rule.field === "__faltante") faltante = value;
      else if (rule.field === "folioInicial" || rule.field === "folioFinal") {
        set(rule.field, String(value));
      } else {
        set(rule.field, rule.int ? Math.round(value) : value);
      }
    }
  }

  // El Excel separa sobrante y faltante en dos renglones; el corte guarda un
  // solo campo con signo, así que gana el que traiga importe.
  const sf = faltante && faltante !== 0 ? faltante : sobrante;
  if (sf !== undefined) set("sobranteFaltante", sf);

  return {
    source: "EXCEL",
    draft,
    raw: { rows: grid.rows.slice(0, 200).map((r) => r.map((c) => c.text)) },
    detected: [...detected],
    warnings: validarCuadres(draft),
  };
}
