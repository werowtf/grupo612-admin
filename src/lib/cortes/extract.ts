import type { CorteDraft } from "./types";

/**
 * Extrae un corte a partir de los renglones del ticket (PDF de texto u OCR).
 *
 * El ticket repite las mismas etiquetas en secciones distintas: "EFECTIVO"
 * aparece en CAJA, en FORMA DE PAGO VENTAS, en FORMA DE PAGO PROPINA y en
 * DECLARACIÓN DE CAJERO, con valores diferentes. Por eso se rastrea en qué
 * sección va cada renglón y las reglas se acotan a la suya: sin eso, el
 * efectivo declarado por el cajero terminaba guardado como propina en efectivo.
 */

/** Normaliza texto: mayúsculas, sin acentos, espacios colapsados. */
function norm(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

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

/** Monto principal de una línea: prioriza el que trae "$", luego el decimal. */
function pickMoney(line: string): number | undefined {
  const nums = numbersIn(line);
  if (nums.length === 0) return undefined;
  return (nums.find((n) => n.currency) ?? nums.find((n) => n.decimals) ?? nums[0]).value;
}

/** Primer entero de una línea (los conteos van justo después de la etiqueta). */
function pickInt(line: string): number | undefined {
  const m = /:\s*(\d[\d,]*)/.exec(line) ?? /\b(\d[\d,]*)\b/.exec(line);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  return Number.isInteger(n) ? n : undefined;
}

type Section = "caja" | "ventas" | "propina" | "producto" | "declaracion" | "otro";

// Anclados al inicio: si no, "TOTAL FORMAS PAGO PROPINA $280.00" se toma por
// encabezado y se pierde el total de propinas.
const SECTION_MARKS: { test: RegExp; section: Section }[] = [
  { test: /^DECLARACION DE CAJERO/, section: "declaracion" },
  { test: /^FORMA DE PAGO PROPINA|^FORMAS? PAGO PROPINA/, section: "propina" },
  { test: /^FORMA DE PAGO VENTAS|^FORMA DE PAGO$/, section: "ventas" },
  { test: /^POR TIPO DE PRODUCTO/, section: "producto" },
  // Cierran la sección anterior para que sus renglones no se sigan leyendo.
  { test: /^POR TIPO DE SERVICIO|^VENTA \(NO INCLUYE/, section: "otro" },
  { test: /^=*\s*CAJA\s*=*$/, section: "caja" },
];

interface MoneyRule {
  field: keyof CorteDraft;
  test: RegExp;
  /** Si se define, la regla solo aplica dentro de esas secciones. */
  sections?: Section[];
}

// Dentro de una línea gana la primera regla que coincide, y por campo gana la
// primera línea: las etiquetas específicas van antes que las genéricas.
const MONEY_RULES: MoneyRule[] = [
  // --- CAJA: solo estos cuatro renglones se guardan. Los "+EFECTIVO",
  // "+TARJETA", "-PROPINAS PAGADAS" y "SALDO FINAL" son flujo de caja y no
  // corresponden a ningún campo del corte.
  { field: "efectivoInicial", test: /EFECTIVO INICIAL|EFECTIVO INIC/, sections: ["caja"] },
  { field: "depositos", test: /DEPOSITOS? EF/, sections: ["caja"] },
  { field: "retiros", test: /RETIROS? EF/, sections: ["caja"] },
  { field: "efectivoDeclarado", test: /EFECTIVO FINAL|EFECTIVO FINA/, sections: ["caja"] },

  // --- Formas de pago de ventas
  { field: "pagoVisa", test: /VISA/, sections: ["ventas"] },
  { field: "pagoMastercard", test: /MASTER ?CARD/, sections: ["ventas"] },
  { field: "pagoAmex", test: /AMERICAN EXPRESS|AMEX/, sections: ["ventas"] },
  { field: "pagoVales", test: /VALES/, sections: ["ventas"] },
  { field: "pagoOtros", test: /CREDITO|^OTROS/, sections: ["ventas"] },
  { field: "totalFormasPago", test: /TOTAL FORMAS DE PAGO|TOTAL FORMAS(?! PAGO PROPINA)/, sections: ["ventas"] },
  { field: "pagoEfectivo", test: /^EFECTIVO/, sections: ["ventas"] },

  // --- Propinas
  { field: "propinaVisa", test: /VISA/, sections: ["propina"] },
  { field: "propinaMastercard", test: /MASTER ?CARD/, sections: ["propina"] },
  { field: "propinaAmex", test: /AMERICAN EXPRESS|AMEX/, sections: ["propina"] },
  { field: "totalPropinas", test: /TOTAL FORMAS PAGO PROPINA|TOTAL PROPINA/, sections: ["propina"] },
  { field: "propinaEfectivo", test: /^EFECTIVO/, sections: ["propina"] },

  // --- Venta por producto
  { field: "ventaAlimentos", test: /^ALIMENTOS/, sections: ["producto"] },
  { field: "ventaBebidas", test: /^BEBIDAS/, sections: ["producto"] },
  { field: "ventaOtros", test: /^OTROS/, sections: ["producto"] },

  // --- Totales y contadores: etiquetas únicas, no hace falta acotar sección,
  // pero sí excluir la declaración del cajero, que repite EFECTIVO/TARJETA.
  { field: "subtotal", test: /^SUBTOTAL/ },
  { field: "descuentos", test: /^-?\s*DESCUENTOS\s*:/ },
  { field: "ventaNeta", test: /^VENTA NETA/ },
  { field: "iva", test: /^IMPUESTOS? (TOTAL|\d)/ },
  { field: "totalVenta", test: /VENTAS? CON IMP/ },
  { field: "cuentaPromedio", test: /CUENTA PROMEDIO/ },
  { field: "sobranteFaltante", test: /SOBRANTE|FALTANTE/ },
  // Respaldo: el bloque de contadores trae "PROPINAS : $X" cuando el ticket no
  // desglosa formas de pago de propina.
  { field: "totalPropinas", test: /^PROPINAS\s*:/ },
];

const INT_RULES: { field: keyof CorteDraft; test: RegExp }[] = [
  { field: "cuentasCanceladas", test: /CUENTAS CANCELADAS/ },
  { field: "cuentasNormales", test: /CUENTAS NORMALES/ },
  { field: "comensales", test: /^COMENSALES/ },
];

/**
 * Sección donde no se captura ningún monto salvo sobrante/faltante: la
 * declaración del cajero repite EFECTIVO/TARJETA/VALES/OTROS con lo que contó
 * a mano, que no es ninguno de los campos del corte.
 *
 * "otro" no bloquea: los totales (subtotal, venta neta, IVA…) van justo
 * después de "POR TIPO DE SERVICIO" y tienen etiquetas propias que no chocan
 * con nada.
 */
const BLOQUEADAS: Section[] = ["declaracion"];

function parseDate(line: string): string | undefined {
  const m = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/.exec(line);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function extractCorteFromLines(rawLines: string[]): {
  draft: CorteDraft;
  detected: (keyof CorteDraft)[];
} {
  const draft: CorteDraft = {};
  const detected = new Set<keyof CorteDraft>();
  // Antes del primer encabezado va la identificación del ticket; se arranca en
  // "otro" para no leer esas líneas como si fueran formas de pago.
  let section: Section = "otro";

  const set = (field: keyof CorteDraft, value: number | string | undefined) => {
    if (value === undefined || value === "") return;
    if (draft[field] !== undefined) return; // la primera coincidencia gana
    // @ts-expect-error asignación dinámica acotada por las reglas
    draft[field] = value;
    detected.add(field);
  };

  for (const rawLine of rawLines) {
    const line = norm(rawLine);
    if (!line) continue;

    const mark = SECTION_MARKS.find((s) => s.test.test(line));
    if (mark) {
      section = mark.section;
      continue; // el encabezado en sí no trae datos
    }

    // --- Identificación
    if (/FOLIO CORTE Z/.test(line)) set("folioCorteZ", (line.match(/(\d+)/) ?? [])[1]);
    else if (/FOLIO INICIAL/.test(line)) set("folioInicial", (line.match(/(\d+)/) ?? [])[1]);
    else if (/FOLIO FINAL/.test(line)) set("folioFinal", (line.match(/(\d+)/) ?? [])[1]);
    if (/FECHA|CORTE Z|CORTE DE CAJA|DEL \d/.test(line)) set("date", parseDate(line));
    if (/MATUTINO/.test(line)) set("turno", "Matutino");
    else if (/VESPERTINO/.test(line)) set("turno", "Vespertino");
    else {
      const t = /TURNO:?\s*(\S+)/.exec(line);
      if (t) set("turno", t[1]);
    }
    const est = /ESTACION:?\s*([^\s|]+)/.exec(line);
    if (est) set("estacion", est[1]);

    // --- Conteos
    for (const r of INT_RULES) {
      if (r.test.test(line)) set(r.field, pickInt(line));
    }

    // --- Montos
    for (const r of MONEY_RULES) {
      if (r.sections && !r.sections.includes(section)) continue;
      if (!r.sections && BLOQUEADAS.includes(section) && r.field !== "sobranteFaltante") continue;
      if (r.test.test(line)) {
        set(r.field, pickMoney(line));
        break; // un monto por línea
      }
    }
  }

  return { draft, detected: [...detected] };
}
