import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface DailySaleTotals {
  efectivo: number;
  tarjeta: number;
  credito: number;
  total: number;
  comida: number;
  bebida: number;
  totalSinImpuesto: number;
}

export async function getDailySales(venueId: string, year: number, month: number) {
  const dateFrom = new Date(Date.UTC(year, month - 1, 1));
  const dateTo = new Date(Date.UTC(year, month, 1)); // exclusivo

  const rows = await prisma.dailySale.findMany({
    where: { venueId, date: { gte: dateFrom, lt: dateTo } },
    orderBy: { date: "asc" },
  });

  const totals: DailySaleTotals = { efectivo: 0, tarjeta: 0, credito: 0, total: 0, comida: 0, bebida: 0, totalSinImpuesto: 0 };
  for (const r of rows) {
    const efectivo = num(r.efectivo);
    const tarjeta = num(r.tarjeta);
    const credito = num(r.credito);
    const comida = num(r.comida);
    const bebida = num(r.bebida);
    totals.efectivo += efectivo;
    totals.tarjeta += tarjeta;
    totals.credito += credito;
    totals.total += efectivo + tarjeta + credito;
    totals.comida += comida;
    totals.bebida += bebida;
    totals.totalSinImpuesto += comida + bebida;
  }

  return { rows, totals };
}
