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

export interface DailySalesDailyTotal {
  date: string; // YYYY-MM-DD
  comida: number;
  bebida: number;
}

/**
 * Venta diaria (comida/bebida) por día, para graficar la tendencia reciente
 * en el dashboard. La ventana de `days` se ancla a la fecha de venta más
 * reciente (no a "hoy"), igual que getVenueDailyTotals con los movimientos
 * bancarios.
 */
export async function getVenueDailySalesTotals(venueId: string, days = 90): Promise<DailySalesDailyTotal[]> {
  const latest = await prisma.dailySale.findFirst({
    where: { venueId },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return [];

  const since = new Date(latest.date);
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const rows = await prisma.dailySale.findMany({
    where: { venueId, date: { gte: since } },
    select: { date: true, comida: true, bebida: true },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, { comida: number; bebida: number }>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    byDay.set(key, { comida: num(r.comida), bebida: num(r.bebida) });
  }

  const result: DailySalesDailyTotal[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key) ?? { comida: 0, bebida: 0 };
    result.push({ date: key, ...entry });
  }
  return result;
}
