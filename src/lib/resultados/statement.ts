/**
 * Estado de resultados de un negocio en un mes, con la misma estructura del
 * libro contable (hoja "ESTADO DE RESULTADOS"). Este archivo es puro (sin base
 * de datos): recibe los totales ya consultados y arma las líneas de la tabla,
 * que usan igual la pantalla y el PDF.
 */

/** Columnas por forma de pago, en el orden en que se muestran. */
export const PAY_COLUMNS = ["Efectivo", "Tarjeta", "Crédito", "Transferencia", "Cheque / otro"] as const;
export type PayIndex = 0 | 1 | 2 | 3 | 4;

/** Montos por forma de pago (mismo orden que PAY_COLUMNS). */
export type Cells = [number, number, number, number, number];

export const emptyCells = (): Cells => [0, 0, 0, 0, 0];

export type LineKind = "section" | "row" | "subtotal" | "total" | "result";

export interface StatementLine {
  label: string;
  kind: LineKind;
  /** Montos por forma de pago; null = el renglón sólo tiene total. */
  cells: Cells | null;
  total: number | null;
  /** Porcentaje a mostrar al final del renglón (ya en 0–1). */
  pct?: number | null;
  /** Texto que explica el porcentaje (p. ej. "del costo de venta"). */
  pctLabel?: string;
}

/** Impuesto estimado sobre la utilidad antes de impuestos (mismo factor que el libro contable). */
export const IMPUESTOS_RATE = 0.19181;

/** Categorías de egreso que no son gasto de operación en este estado. */
export const COSTO_VENTA_CATEGORIES = ["Cocina", "Barra"] as const;
/** "Impuestos" se estima aparte; los préstamos entre negocios no son ingreso ni gasto del negocio. */
export const EXCLUDED_EGRESO_CATEGORIES = ["Impuestos", "Préstamo a negocio", "Reembolso de préstamo"] as const;
export const EXCLUDED_INGRESO_CATEGORIES = ["Venta diaria", "Préstamo recibido", "Reembolso de préstamo"] as const;

/** Orden de los gastos de operación (el del libro contable); lo que no esté aquí va después, por nombre. */
export const GASTOS_OPERACION_ORDER = [
  "Otros",
  "Mantenimiento",
  "Gas",
  "Ambientación",
  "Pago propinas",
  "Servicios",
  "Papelería",
  "Limpieza",
  "Eq. restaurante",
  "Gasolina",
  "Consultas médicas",
  "Publicidad",
  "Renta",
  "Nómina",
  "Nómina cocina",
  "Nómina servicio",
] as const;

export interface StatementInput {
  ventas: Cells;
  /** Venta sin impuesto del mes (para los % de costo de venta). */
  comida: number;
  bebida: number;
  /** Ingresos registrados (sin la venta diaria ni préstamos), por forma de pago. */
  otrosIngresos: Cells;
  /** Egresos del mes por categoría y forma de pago. */
  egresos: Map<string, Cells>;
  /** Comisiones bancarias del mes (cargos menos abonos). */
  comisionesBanco: number;
  /** Comisión de nómina administrativa (venta total × porcentaje del negocio). */
  nominaAdmin: number;
}

const sum = (c: Cells) => c[0] + c[1] + c[2] + c[3] + c[4];
const add = (a: Cells, b: Cells): Cells => [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3], a[4] + b[4]];

export interface Statement {
  lines: StatementLine[];
  kpis: {
    ventaTotal: number;
    ingresoTotal: number;
    utilidadBruta: number;
    utilidadOperativa: number;
    utilidadNeta: number;
    pctUtilidad: number | null;
  };
}

export function buildStatement(i: StatementInput): Statement {
  const lines: StatementLine[] = [];
  const row = (label: string, cells: Cells, extra: Partial<StatementLine> = {}) =>
    lines.push({ label, kind: "row", cells, total: sum(cells), ...extra });
  const single = (label: string, total: number, kind: LineKind, extra: Partial<StatementLine> = {}) =>
    lines.push({ label, kind, cells: null, total, ...extra });

  // ── Ingresos ─────────────────────────────────────────────
  const ventaTotal = sum(i.ventas);
  lines.push({ label: "Ingresos", kind: "section", cells: null, total: null });
  row("Ventas", i.ventas);
  row("Otros ingresos", i.otrosIngresos);
  const ingresos = add(i.ventas, i.otrosIngresos);
  lines.push({ label: "Total", kind: "subtotal", cells: ingresos, total: sum(ingresos) });
  const ingresoTotal = sum(ingresos);
  single("Ingreso total", ingresoTotal, "total");

  // ── Costo de ventas ──────────────────────────────────────
  lines.push({ label: "Gastos variables (costo de ventas)", kind: "section", cells: null, total: null });
  const cocina = i.egresos.get("Cocina") ?? emptyCells();
  const barra = i.egresos.get("Barra") ?? emptyCells();
  // % de costo: cocina contra la comida con IVA, barra contra la bebida con IVA, como en el libro.
  const ratio = (cost: number, base: number) => (base > 0 ? cost / base : null);
  row("Cocina", cocina, { pct: ratio(sum(cocina), i.comida * 1.16), pctLabel: "% costo de venta (cocina)" });
  row("Barra", barra, { pct: ratio(sum(barra), i.bebida * 1.16), pctLabel: "% costo de venta (barra)" });
  const costo = add(cocina, barra);
  lines.push({ label: "Total", kind: "subtotal", cells: costo, total: sum(costo) });
  const costoTotal = sum(costo);
  single("Costo de ventas total", costoTotal, "total", {
    pct: ratio(costoTotal, ventaTotal),
    pctLabel: "% costo de venta general",
  });

  const utilidadBruta = ingresoTotal - costoTotal;
  single("Utilidad bruta", utilidadBruta, "result");

  // ── Gastos de operación ──────────────────────────────────
  lines.push({ label: "Gastos de operación", kind: "section", cells: null, total: null });
  const known = new Set<string>(GASTOS_OPERACION_ORDER);
  const skip = new Set<string>([...COSTO_VENTA_CATEGORIES, ...EXCLUDED_EGRESO_CATEGORIES]);
  const extras = [...i.egresos.keys()].filter((c) => !known.has(c) && !skip.has(c)).sort((a, b) => a.localeCompare(b, "es"));
  let gastos = emptyCells();
  for (const cat of [...GASTOS_OPERACION_ORDER, ...extras]) {
    const cells = i.egresos.get(cat) ?? emptyCells();
    gastos = add(gastos, cells);
    row(cat, cells);
  }
  // La nómina administrativa es la comisión (venta × %); en el libro va en la columna de efectivo.
  const nominaAdmin: Cells = [i.nominaAdmin, 0, 0, 0, 0];
  gastos = add(gastos, nominaAdmin);
  row("Nómina admin", nominaAdmin);
  lines.push({ label: "Total", kind: "subtotal", cells: gastos, total: sum(gastos) });
  const gastosTotal = sum(gastos);
  single("Gastos de operación total", gastosTotal, "total");

  const utilidadOperativa = utilidadBruta - gastosTotal;
  single("Utilidad operativa", utilidadOperativa, "result");

  // ── Comisiones, impuestos y utilidad neta ────────────────
  const comisiones: Cells = [0, i.comisionesBanco, 0, 0, 0]; // como el libro, en la columna de tarjeta
  lines.push({ label: "Comisiones bancarias", kind: "row", cells: comisiones, total: i.comisionesBanco });
  const utilidadAntes = utilidadOperativa - i.comisionesBanco;
  single("Utilidad antes de impuestos", utilidadAntes, "result");

  const impuestos = utilidadAntes > 0 ? utilidadAntes * IMPUESTOS_RATE : 0;
  single("Impuestos (estimado 19.181%)", impuestos, "row");

  const utilidadNeta = utilidadAntes - impuestos;
  const pctUtilidad = ventaTotal > 0 ? utilidadNeta / ventaTotal : null;
  single("Utilidad neta", utilidadNeta, "result", { pct: pctUtilidad, pctLabel: "% de utilidad sobre venta" });

  return { lines, kpis: { ventaTotal, ingresoTotal, utilidadBruta, utilidadOperativa, utilidadNeta, pctUtilidad } };
}
