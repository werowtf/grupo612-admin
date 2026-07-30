import type { Bank, TxCategory, TxDirection } from "@/generated/prisma/enums";

/** Movimiento normalizado, común a todos los bancos. */
export interface NormalizedRow {
  date: Date;
  time?: string;
  description: string;
  descriptionLong?: string;
  direction: TxDirection;
  amount: number; // siempre positivo
  balance?: number;
  reference?: string;
  concept?: string;
  category: TxCategory;
  counterpartyName?: string;
  counterpartyRfc?: string;
  trackingKey?: string;
  raw: Record<string, unknown>;
}

export interface ParsedStatement {
  bank: Bank;
  rows: NormalizedRow[];
  periodStart?: Date;
  periodEnd?: Date;
  totalCargos: number; // suma de cargos (positivo)
  totalAbonos: number; // suma de abonos (positivo)
}
