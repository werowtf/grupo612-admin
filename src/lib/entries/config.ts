import type {
  EntryType,
  PaymentMethod,
  EntrySource,
} from "@/generated/prisma/enums";

export const entryTypeLabels: Record<EntryType, string> = {
  INGRESO: "Ingreso",
  EGRESO: "Egreso",
};

export const paymentLabels: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  CHEQUE: "Cheque",
  OTRO: "Otro",
};

export const sourceLabels: Record<EntrySource, string> = {
  MANUAL: "Manual",
  OCR: "Foto",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "EFECTIVO",
  "TARJETA",
  "TRANSFERENCIA",
  "CHEQUE",
  "OTRO",
];

/**
 * Conceptos con los que se da de alta un negocio nuevo, tomados del libro
 * contable que lleva la contadora (UNO Bar, julio 2026).
 *
 * Son solo la semilla: a partir del alta, cada negocio administra su propia
 * lista en la tabla `EntryCategory`, porque cada sede maneja conceptos
 * distintos en su día a día.
 */
export const DEFAULT_EGRESO_CATEGORIES = [
  "Cocina",
  "Barra",
  "Nómina cocina",
  "Nómina servicio",
  "Nómina admin",
  "Pago propinas",
  "Renta",
  "Servicios",
  "Gas",
  "Gasolina",
  "Mantenimiento",
  "Eq. restaurante",
  "Limpieza",
  "Papelería",
  "Uniformes",
  "Ambientación",
  "Publicidad",
  "Consultas médicas",
  "Comisiones",
  "Impuestos",
  "Otros",
];

/**
 * "Venta diaria" no está aquí: tiene su propio modelo (DailySale) con el
 * desglose de efectivo/tarjeta/crédito y comida/bebida, así que no se
 * captura como un movimiento genérico más.
 */
export const DEFAULT_INGRESO_CATEGORIES = [
  "Covers",
  "Fondo de emergencia",
  "Otros ingresos",
];

export function defaultCategoriesFor(type: EntryType): string[] {
  return type === "INGRESO" ? DEFAULT_INGRESO_CATEGORIES : DEFAULT_EGRESO_CATEGORIES;
}

/**
 * Color por concepto de egreso. El libro contable de la contadora agrupa
 * varios conceptos bajo el mismo color (todo lo "operativo" en azul, por
 * ejemplo) — sirve para su Excel, pero como badge no distingue nada: 8
 * conceptos del mismo azul son indistinguibles a simple vista. Aquí cada
 * concepto tiene su propio color, uno por familia de Tailwind, para que el
 * color sí identifique la categoría.
 */
const EGRESO_CATEGORY_BADGE: Record<string, string> = {
  Cocina: "bg-green-100 text-green-700",
  Barra: "bg-blue-100 text-blue-700",
  "Nómina cocina": "bg-indigo-100 text-indigo-700",
  "Nómina servicio": "bg-violet-100 text-violet-700",
  "Nómina admin": "bg-purple-100 text-purple-700",
  "Pago propinas": "bg-fuchsia-100 text-fuchsia-700",
  Renta: "bg-teal-100 text-teal-700",
  Servicios: "bg-emerald-100 text-emerald-700",
  Gas: "bg-amber-100 text-amber-800",
  Gasolina: "bg-orange-100 text-orange-700",
  Mantenimiento: "bg-cyan-100 text-cyan-700",
  "Eq. restaurante": "bg-sky-100 text-sky-700",
  Limpieza: "bg-lime-100 text-lime-700",
  Papelería: "bg-yellow-100 text-yellow-800",
  Uniformes: "bg-rose-100 text-rose-700",
  Ambientación: "bg-pink-100 text-pink-700",
  Publicidad: "bg-red-100 text-red-700",
  "Consultas médicas": "bg-stone-100 text-stone-700",
  Comisiones: "bg-slate-100 text-slate-700",
  Impuestos: "bg-zinc-100 text-zinc-700",
  Otros: "bg-neutral-100 text-neutral-700",
};

const INGRESO_CATEGORY_BADGE: Record<string, string> = {
  Covers: "bg-sky-100 text-sky-700",
  "Fondo de emergencia": "bg-amber-100 text-amber-800",
  "Otros ingresos": "bg-violet-100 text-violet-700",
};

// Sólo para conceptos que no están en la lista (p.ej. uno que un negocio
// haya renombrado o agregado desde Conceptos): gris neutro, sin asignar un
// color de la lista de arriba dos veces.
const DEFAULT_CATEGORY_BADGE = "bg-gray-100 text-gray-600";

export function categoryBadgeClass(type: EntryType, category: string): string {
  const map = type === "INGRESO" ? INGRESO_CATEGORY_BADGE : EGRESO_CATEGORY_BADGE;
  return map[category] ?? DEFAULT_CATEGORY_BADGE;
}
