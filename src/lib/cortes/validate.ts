import type { CorteDraft } from "./types";
import { ALL_CORTE_FIELDS } from "./fields";
import { formatMXN } from "@/lib/utils";

/**
 * Verifica los cuadres que el propio ticket ya trae impresos.
 *
 * Es una red determinista sobre la lectura automática: un dígito mal leído
 * (p.ej. una propina de 590.25 en vez de 592.25) rompe alguna de estas sumas,
 * así que en vez de pedirle al usuario que revise los 30 campos "por si acaso",
 * se le señalan los dos o tres que no cuadran.
 *
 * No corrige nada por su cuenta: cuando la suma falla no hay forma de saber si
 * el error está en un sumando o en el total, así que solo avisa.
 */

// Un centavo de diferencia suele ser redondeo del propio ticket, no un error
// de lectura; los dígitos mal leídos dan diferencias mucho mayores.
const TOLERANCIA = 0.02;

const LABEL = new Map(ALL_CORTE_FIELDS.map((f) => [f.key, f.label]));
const labelOf = (k: keyof CorteDraft) => LABEL.get(k) ?? String(k);

type Money = Extract<keyof CorteDraft, string>;

interface SumCheck {
  /** Cómo se nombra el grupo en el aviso ("Las propinas..."). */
  concepto: string;
  partes: Money[];
  total: Money;
}

const SUMAS: SumCheck[] = [
  {
    concepto: "Las formas de pago",
    partes: ["pagoEfectivo", "pagoVisa", "pagoMastercard", "pagoAmex", "pagoVales", "pagoOtros"],
    total: "totalFormasPago",
  },
  {
    concepto: "Las propinas",
    partes: ["propinaEfectivo", "propinaVisa", "propinaMastercard", "propinaAmex"],
    total: "totalPropinas",
  },
  {
    concepto: "La venta por producto",
    partes: ["ventaAlimentos", "ventaBebidas", "ventaOtros"],
    total: "subtotal",
  },
];

function num(draft: CorteDraft, key: Money): number | undefined {
  const v = draft[key];
  return typeof v === "number" ? v : undefined;
}

/** Suma los sumandos presentes; los ausentes cuentan como 0. */
function sumar(draft: CorteDraft, partes: Money[]): { suma: number; presentes: Money[] } {
  let suma = 0;
  const presentes: Money[] = [];
  for (const p of partes) {
    const v = num(draft, p);
    if (v !== undefined) {
      suma += v;
      presentes.push(p);
    }
  }
  return { suma: Math.round(suma * 100) / 100, presentes };
}

/**
 * Devuelve un aviso por cada cuadre que no da. Vacío = todo cuadra (o no hay
 * suficientes campos para comprobarlo).
 */
export function validarCuadres(draft: CorteDraft): string[] {
  const avisos: string[] = [];

  for (const { concepto, partes, total } of SUMAS) {
    const esperado = num(draft, total);
    if (esperado === undefined) continue; // sin total no hay contra qué comparar
    const { suma, presentes } = sumar(draft, partes);
    if (presentes.length === 0) continue;
    if (Math.abs(suma - esperado) <= TOLERANCIA) continue;

    avisos.push(
      `${concepto} no cuadran: ${presentes.map(labelOf).join(" + ")} = ${formatMXN(suma)}, ` +
        `pero "${labelOf(total)}" dice ${formatMXN(esperado)}. Revisa esos campos.`,
    );
  }

  // Subtotal - descuentos = venta neta
  const subtotal = num(draft, "subtotal");
  const descuentos = num(draft, "descuentos");
  const ventaNeta = num(draft, "ventaNeta");
  if (subtotal !== undefined && descuentos !== undefined && ventaNeta !== undefined) {
    const esperado = Math.round((subtotal - descuentos) * 100) / 100;
    if (Math.abs(esperado - ventaNeta) > TOLERANCIA) {
      avisos.push(
        `La venta neta no cuadra: subtotal ${formatMXN(subtotal)} − descuentos ${formatMXN(descuentos)} = ` +
          `${formatMXN(esperado)}, pero "Venta neta" dice ${formatMXN(ventaNeta)}. Revisa esos campos.`,
      );
    }
  }

  // Venta neta + IVA = total con impuestos
  const iva = num(draft, "iva");
  const totalVenta = num(draft, "totalVenta");
  if (ventaNeta !== undefined && iva !== undefined && totalVenta !== undefined) {
    const esperado = Math.round((ventaNeta + iva) * 100) / 100;
    if (Math.abs(esperado - totalVenta) > TOLERANCIA) {
      avisos.push(
        `El total con impuestos no cuadra: venta neta ${formatMXN(ventaNeta)} + IVA ${formatMXN(iva)} = ` +
          `${formatMXN(esperado)}, pero "Total con impuestos" dice ${formatMXN(totalVenta)}. Revisa esos campos.`,
      );
    }
  }

  return avisos;
}
