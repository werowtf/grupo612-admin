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
  cardTotal: number; // Visa + Mastercard + Amex del corte, ventas + propinas
  linked: DepositRow[];
  linkedTotal: number;
  suggestions: DepositRow[];
}

/**
 * Descripciones de las liquidaciones de la terminal: Santander "DEPOSITO VENTAS
 * DEL DIA" y BanBajío "Deposito Negocios Afiliados". Los SPEI, "Entrega de
 * recursos", bonificaciones, etc. no son liquidaciones de tarjeta, así que el
 * auto-conciliar los ignora (aunque sí se muestran como sugerencias manuales).
 */
const CARD_SETTLEMENT = /VENTAS DEL DIA|NEGOCIOS AFILIADOS/i;
export function isCardSettlement(description: string): boolean {
  return CARD_SETTLEMENT.test(description);
}

/**
 * Banda aceptada para el auto-conciliar: el depósito es el total de tarjeta
 * menos la comisión (tasa de descuento + IVA, normalmente 0 a 4%), por eso
 * puede quedar hasta 6% abajo y, por redondeos, no más de 0.5% arriba. Con la
 * tolerancia anterior (20%) se vinculaban depósitos que no correspondían.
 */
export const AUTO_MATCH_BAND = { min: -0.06, max: 0.005 } as const;

export type AutoMatchDecision =
  | { kind: "link"; deposit: DepositRow }
  | { kind: "no-candidates" }
  | { kind: "out-of-band"; closest: DepositRow }
  | { kind: "ambiguous"; count: number };

/**
 * Decide si el auto-conciliar puede vincular un depósito: solo liquidaciones
 * de tarjeta, dentro de la banda de comisión y siendo la única que cuadra.
 * Con varias que cuadran, o ninguna, no vincula y lo deja a la revisión manual.
 */
export function pickAutoMatch(remaining: number, suggestions: DepositRow[]): AutoMatchDecision {
  const settlements = suggestions.filter((s) => isCardSettlement(s.description));
  if (settlements.length === 0) return { kind: "no-candidates" };
  const inBand = settlements.filter((s) => {
    const ratio = (s.amount - remaining) / remaining;
    return ratio >= AUTO_MATCH_BAND.min && ratio <= AUTO_MATCH_BAND.max;
  });
  if (inBand.length === 1) return { kind: "link", deposit: inBand[0] };
  if (inBand.length > 1) return { kind: "ambiguous", count: inBand.length };
  const closest = [...settlements].sort((a, b) => Math.abs(a.amount - remaining) - Math.abs(b.amount - remaining))[0];
  return { kind: "out-of-band", closest };
}

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/**
 * Lo que el banco debería depositar por tarjeta: ventas + propinas con
 * tarjeta, porque la terminal liquida ambas juntas en un solo abono (la
 * propina no es venta, pero sí es dinero de tarjeta que llega igual al
 * banco). Ver feedback de la contadora: el ticket físico también suma
 * ambas en su renglón "TARJETA".
 */
export function cardTotalOf(corte: Corte): number {
  return (
    num(corte.pagoVisa) +
    num(corte.pagoMastercard) +
    num(corte.pagoAmex) +
    num(corte.propinaVisa) +
    num(corte.propinaMastercard) +
    num(corte.propinaAmex)
  );
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
