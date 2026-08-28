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

export const DEFAULT_INGRESO_CATEGORIES = [
  "Venta diaria",
  "Covers",
  "Fondo de emergencia",
  "Otros ingresos",
];

export function defaultCategoriesFor(type: EntryType): string[] {
  return type === "INGRESO" ? DEFAULT_INGRESO_CATEGORIES : DEFAULT_EGRESO_CATEGORIES;
}
