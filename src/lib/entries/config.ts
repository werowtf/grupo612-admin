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
  "OTRO",
];

/** Categorías sugeridas para egresos (compras y gastos operativos). */
export const EGRESO_CATEGORIES = [
  "Insumos / Alimentos",
  "Bebidas",
  "Limpieza",
  "Desechables",
  "Mantenimiento",
  "Renta",
  "Servicios (luz/agua/gas)",
  "Nómina",
  "Proveedor",
  "Impuestos",
  "Otro",
];

/** Categorías sugeridas para ingresos. */
export const INGRESO_CATEGORIES = ["Venta", "Evento", "Otro ingreso"];

export function categoriesFor(type: EntryType): string[] {
  return type === "INGRESO" ? INGRESO_CATEGORIES : EGRESO_CATEGORIES;
}
