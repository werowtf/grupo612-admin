import "server-only";
import { prisma } from "@/lib/prisma";
import type { Corte, BankTransaction } from "@/generated/prisma/client";

/** Ventana de días para buscar el depósito (el abono suele llegar T+1 a T+4). */
const DAYS_BEFORE = 1;
const DAYS_AFTER = 5;

export interface DepositRow {
  id: string;
  date: string; // ISO
  description: string;
  amount: number;
  accountAlias: string;
  diff: number; // amount - cardTotal (para ordenar/mostrar)
}

export interface CorteMatching {
  cardTotal: number; // Visa + Mastercard + Amex del corte
  linked: DepositRow[];
  linkedTotal: number;
  suggestions: DepositRow[];
}

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export function cardTotalOf(corte: Corte): number {
  return num(corte.pagoVisa) + num(corte.pagoMastercard) + num(corte.pagoAmex);
}

function toRow(
  tx: BankTransaction & { bankAccount?: { alias: string } },
  cardTotal: number,
): DepositRow {
  const amount = num(tx.amount);
  return {
    id: tx.id,
    date: tx.date.toISOString(),
    description: tx.description,
    amount,
    accountAlias: tx.bankAccount?.alias ?? "",
    diff: Math.round((amount - cardTotal) * 100) / 100,
  };
}

/**
 * Calcula la conciliación de un corte con los depósitos bancarios:
 * total de tarjeta esperado, depósitos ya vinculados y sugerencias.
 */
export async function getCorteMatching(corte: Corte): Promise<CorteMatching> {
  const cardTotal = Math.round(cardTotalOf(corte) * 100) / 100;

  const from = new Date(corte.date);
  from.setDate(from.getDate() - DAYS_BEFORE);
  const to = new Date(corte.date);
  to.setDate(to.getDate() + DAYS_AFTER);

  const [linkedTx, candidateTx] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { corteId: corte.id },
      include: { bankAccount: { select: { alias: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.bankTransaction.findMany({
      where: {
        corteId: null,
        category: "DEPOSITO",
        direction: "ABONO",
        date: { gte: from, lte: to },
        bankAccount: { venueId: corte.venueId },
      },
      include: { bankAccount: { select: { alias: true } } },
      orderBy: { date: "asc" },
      take: 40,
    }),
  ]);

  const linked = linkedTx.map((t) => toRow(t, cardTotal));
  const linkedTotal = Math.round(linked.reduce((s, r) => s + r.amount, 0) * 100) / 100;

  // Ordena las sugerencias por cercanía al total de tarjeta restante.
  const remaining = cardTotal - linkedTotal;
  const suggestions = candidateTx
    .map((t) => toRow(t, cardTotal))
    .sort((a, b) => Math.abs(a.amount - remaining) - Math.abs(b.amount - remaining));

  return { cardTotal, linked, linkedTotal, suggestions };
}
