import { createHash } from "node:crypto";
import type { NormalizedRow } from "./types";

/**
 * Huella para detectar duplicados de un mismo movimiento dentro de una cuenta.
 * Combina fecha, dirección, monto, saldo, descripción y referencia. El saldo
 * distingue movimientos idénticos consecutivos.
 */
export function computeDedupeHash(row: NormalizedRow): string {
  const parts = [
    row.date.toISOString().slice(0, 10),
    row.direction,
    row.amount.toFixed(2),
    row.balance != null ? row.balance.toFixed(2) : "",
    row.description.trim().toUpperCase(),
    (row.reference ?? "").trim(),
  ];
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}
