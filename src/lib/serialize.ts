import type { BankTransaction } from "@/generated/prisma/client";
import type { TxRow } from "@/components/transactions-table";
import { txMerchant } from "@/lib/import/merchant";

/** Convierte un BankTransaction (con Decimal/Date) al formato plano del cliente. */
export function toTxRow(t: BankTransaction): TxRow {
  return {
    id: t.id,
    date: t.date.toISOString(),
    time: t.time,
    description: t.description,
    descriptionLong: t.descriptionLong,
    merchant: txMerchant({ description: t.description, concept: t.concept, counterpartyName: t.counterpartyName }),
    direction: t.direction,
    amount: Number(t.amount.toString()),
    category: t.category,
    status: t.status,
    autoCategorized: t.autoCategorized,
  };
}
