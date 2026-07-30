import type { CorteDraft } from "./types";

/** Normaliza texto: mayúsculas, sin acentos, espacios colapsados. */
function norm(s: string): string {
  return s
    .toUpperCase()
    .replace(/[ÁÀÂÄ]/g, "A")
    .replace(/[ÉÈÊË]/g, "E")
    .replace(/[ÍÌÎÏ]/g, "I")
    .replace(/[ÓÒÔÖ]/g, "O")
    .replace(/[ÚÙÛÜ]/g, "U")
    .replace(/Ñ/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

/** Todos los números de una línea, como {value, hasCurrency, hasDecimals, index}. */
function numbersIn(line: string): { value: number; currency: boolean; decimals: boolean }[] {
  const out: { value: number; currency: boolean; decimals: boolean }[] = [];
  const re = /(\$?)\s?(-?\d[\d,]*(?:\.\d+)?)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const raw = m[2].replace(/,/g, "");
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    out.push({ value, currency: m[1] === "$", decimals: /\.\d+/.test(m[2]) });
  }
  return out;
}

/** Elige el monto principal de una línea (prioriza el valor con `$`, luego con decimales). */
function pickMoney(line: string): number | undefined {
  const nums = numbersIn(line);
  if (nums.length === 0) return undefined;
  const withCurrency = nums.find((n) => n.currency);
  if (withCurrency) return withCurrency.value;
  const withDecimals = nums.find((n) => n.decimals);
  if (withDecimals) return withDecimals.value;
  return nums[0].value;
}

/** Último entero de una línea (para conteos: comensales, cuentas). */
function pickInt(line: string): number | undefined {
  const matches = [...line.matchAll(/\b(\d[\d,]*)\b/g)].map((m) =>
    Number(m[1].replace(/,/g, "")),
  );
  const ints = matches.filter((n) => Number.isInteger(n));
  return ints.length ? ints[ints.length - 1] : undefined;
}

type Section = "ventas" | "propina" | null;

interface MoneyRule {
  field: keyof CorteDraft;
  test: RegExp;
  section?: Section; // si se define, sólo aplica en esa sección
}

// Reglas ordenadas: la primera que coincide (y respeta la sección) gana por campo.
const MONEY_RULES: MoneyRule[] = [
  // Control de caja (labels específicos primero)
  { field: "efectivoInicial", test: /EFECTIVO INIC/ },
  { field: "efectivoDeclarado", test: /EFECTIVO FINA|EFECTIVO DECLARADO|TOTAL DECLARADO/ },
  { field: "sobranteFaltante", test: /SOBRANTE|FALTANTE/ },
  { field: "retiros", test: /RETIRO/ },
  { field: "depositos", test: /DEPOSITO EFE|DEPOSITOS/ },

  // Propinas (sección propina)
  { field: "propinaVisa", test: /VISA/, section: "propina" },
  { field: "propinaMastercard", test: /MASTER ?CARD/, section: "propina" },
  { field: "propinaAmex", test: /AMERICAN EXPRESS|AMEX/, section: "propina" },
  { field: "propinaEfectivo", test: /EFECTIVO/, section: "propina" },
  { field: "totalPropinas", test: /TOTAL (FORMAS )?(PAGO )?PROPINA|PROPINAS PAGA|TOTAL PROPINA/ },

  // Formas de pago de ventas
  { field: "pagoVisa", test: /VISA/, section: "ventas" },
  { field: "pagoMastercard", test: /MASTER ?CARD/, section: "ventas" },
  { field: "pagoAmex", test: /AMERICAN EXPRESS|AMEX/, section: "ventas" },
  { field: "pagoVales", test: /VALES/, section: "ventas" },
  { field: "pagoEfectivo", test: /^EFECTIVO\b/, section: "ventas" },
  { field: "totalFormasPago", test: /TOTAL FORMAS(?! PAGO PROPINA)/, section: "ventas" },

  // Ventas por producto
  { field: "ventaAlimentos", test: /ALIMENTOS/ },
  { field: "ventaBebidas", test: /BEBIDAS/ },

  // Totales
  { field: "iva", test: /^I ?V ?A\b|IMPUESTO/ },
  { field: "ventaNeta", test: /VENTA NETA/ },
  { field: "descuentos", test: /DESCUENTO/ },
  { field: "subtotal", test: /SUBTOTAL/ },
  { field: "totalVenta", test: /VENTAS? CON IMP|TOTAL VENTA|VENTA TOTAL/ },
  { field: "cuentaPromedio", test: /CUENTA PROMEDIO/ },
];

interface IntRule {
  field: keyof CorteDraft;
  test: RegExp;
}
const INT_RULES: IntRule[] = [
  { field: "cuentasCanceladas", test: /CUENTAS CANCELADAS/ },
  { field: "cuentasNormales", test: /CUENTAS NORMALES/ },
  { field: "comensales", test: /COMENSALES/ },
];

function detectSection(line: string, current: Section): Section {
  if (/FORMA DE PAGO PROPINA|PROPINAS?$|FORMAS? PAGO PROPINA/.test(line)) return "propina";
  if (/FORMA DE PAGO VENTAS|FORMA DE PAGO$|FORMAS? DE PAGO/.test(line)) return "ventas";
  return current;
}

function parseDate(line: string): string | undefined {
  const m = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(line);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  const day = d.padStart(2, "0");
  const mon = mo.padStart(2, "0");
  return `${y}-${mon}-${day}`;
}

/**
 * Extrae un borrador de corte a partir de líneas de texto (OCR o filas de Excel
 * ya aplanadas). Rastrea la sección (ventas/propina) para desambiguar tarjetas.
 */
export function extractCorteFromLines(rawLines: string[]): {
  draft: CorteDraft;
  detected: (keyof CorteDraft)[];
} {
  const draft: CorteDraft = {};
  const detected = new Set<keyof CorteDraft>();
  let section: Section = "ventas"; // por defecto, formas de pago de ventas

  const set = (field: keyof CorteDraft, value: number | string | undefined) => {
    if (value === undefined) return;
    if (draft[field] !== undefined) return; // primera coincidencia gana
    // @ts-expect-error asignación dinámica validada por reglas
    draft[field] = value;
    detected.add(field);
  };

  for (const rawLine of rawLines) {
    const line = norm(rawLine);
    if (!line) continue;

    section = detectSection(line, section);

    // Identificación (texto)
    if (/FOLIO CORTE Z/.test(line)) set("folioCorteZ", (line.match(/(\d+)/) ?? [])[1]);
    else if (/FOLIO INICIAL/.test(line)) set("folioInicial", (line.match(/(\d+)/) ?? [])[1]);
    else if (/FOLIO FINAL/.test(line)) set("folioFinal", (line.match(/(\d+)/) ?? [])[1]);
    if (/FECHA|CORTE Z DEL|DEL \d/.test(line)) set("date", parseDate(line));
    if (/MATUTINO/.test(line)) set("turno", "Matutino");
    else if (/VESPERTINO/.test(line)) set("turno", "Vespertino");

    // Enteros (conteos)
    for (const r of INT_RULES) {
      if (r.test.test(line)) set(r.field, pickInt(line));
    }

    // Montos
    for (const r of MONEY_RULES) {
      if (r.section && r.section !== section) continue;
      if (r.test.test(line)) {
        set(r.field, pickMoney(line));
        break; // una regla de monto por línea
      }
    }
  }

  return { draft, detected: [...detected] };
}
