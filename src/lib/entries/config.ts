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
 * Color por concepto de egreso, tomado tal cual del "LISTA DE CONCEPTOS POR
 * COLOR" del libro contable de la contadora, para que la tabla se lea igual
 * que su Excel.
 */
const EGRESO_CATEGORY_BADGE: Record<string, string> = {
  Cocina: "bg-green-100 text-green-700",
  Servicios: "bg-green-100 text-green-700",

  Barra: "bg-blue-100 text-blue-700",
  Ambientación: "bg-blue-100 text-blue-700",
  "Pago propinas": "bg-blue-100 text-blue-700",
  Uniformes: "bg-blue-100 text-blue-700",
  Limpieza: "bg-blue-100 text-blue-700",
  Publicidad: "bg-blue-100 text-blue-700",
  "Nómina cocina": "bg-blue-100 text-blue-700",
  "Nómina servicio": "bg-blue-100 text-blue-700",

  Mantenimiento: "bg-teal-600 text-white",
  "Eq. restaurante": "bg-teal-600 text-white",
  Renta: "bg-teal-600 text-white",
  "Nómina admin": "bg-teal-600 text-white",

  Gas: "bg-yellow-100 text-yellow-800",
  Papelería: "bg-yellow-100 text-yellow-800",
  Gasolina: "bg-yellow-100 text-yellow-800",

  "Consultas médicas": "bg-pink-100 text-pink-700",

  Comisiones: "bg-red-100 text-red-700",
  Impuestos: "bg-red-100 text-red-700",

  Otros: "bg-gray-100 text-gray-600",
};

const DEFAULT_CATEGORY_BADGE = "bg-gray-100 text-gray-600";

export function egresoCategoryBadgeClass(category: string): string {
  return EGRESO_CATEGORY_BADGE[category] ?? DEFAULT_CATEGORY_BADGE;
}
