import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFmt = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
});

/** Formatea un monto (number | string | Prisma.Decimal) como pesos MXN. */
export function formatMXN(value: number | string | { toString(): string }): string {
  const n = typeof value === "number" ? value : Number(value.toString());
  return currencyFmt.format(Number.isFinite(n) ? n : 0);
}

// Las fechas de negocio (cortes, movimientos, periodos de estados de cuenta)
// se guardan como medianoche UTC para representar un día de calendario puro,
// sin importar en qué zona horaria corra el proceso que las renderiza.
const dateFmt = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return dateFmt.format(d);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
