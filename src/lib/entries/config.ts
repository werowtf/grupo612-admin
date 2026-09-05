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
  SISTEMA: "Automático",
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
 *
 * En modo oscuro el fondo pastel (bg-*-100) se ve casi blanco sobre un
 * fondo negro, así que se cambia a un fondo del mismo color con opacidad
 * baja (bg-*-500/15) y texto claro — el mismo truco que ya usa el tema
 * oscuro de la app para sus fondos de estado (ver --color-*-bg en globals.css).
 */
const EGRESO_CATEGORY_BADGE: Record<string, string> = {
  Cocina: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
  Barra: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  "Nómina cocina": "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
  "Nómina servicio": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  "Nómina admin": "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  "Pago propinas": "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
  Renta: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  Servicios: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  Gas: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  Gasolina: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  Mantenimiento: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  "Eq. restaurante": "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  Limpieza: "bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300",
  Papelería: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300",
  Uniformes: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  Ambientación: "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300",
  Publicidad: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  "Consultas médicas": "bg-stone-100 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300",
  Comisiones: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  Impuestos: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/20 dark:text-zinc-300",
  Otros: "bg-neutral-100 text-neutral-700 dark:bg-neutral-500/20 dark:text-neutral-300",
};

const INGRESO_CATEGORY_BADGE: Record<string, string> = {
  Covers: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  "Fondo de emergencia": "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  "Otros ingresos": "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
};

// Sólo para conceptos que no están en la lista (p.ej. uno que un negocio
// haya renombrado o agregado desde Conceptos): gris neutro, sin asignar un
// color de la lista de arriba dos veces.
const DEFAULT_CATEGORY_BADGE = "bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-300";

export function categoryBadgeClass(type: EntryType, category: string): string {
  const map = type === "INGRESO" ? INGRESO_CATEGORY_BADGE : EGRESO_CATEGORY_BADGE;
  return map[category] ?? DEFAULT_CATEGORY_BADGE;
}
