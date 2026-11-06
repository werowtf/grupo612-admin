import "server-only";
import { prisma } from "@/lib/prisma";
import { propinasTarjeta, type CorteAmounts } from "./amounts";

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

  // Propinas con tarjeta por día (vienen dentro de "tarjeta" en los días de corte).
  const propinas = await getPropinasPorDia(venueId, dateFrom, dateTo);

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
    totals.total += efectivo + tarjeta + credito - (r.source === "CORTE" ? (propinas.get(r.date.toISOString().slice(0, 10)) ?? 0) : 0);
    totals.comida += comida;
    totals.bebida += bebida;
    totals.totalSinImpuesto += comida + bebida;
  }

  return { rows, totals, propinas };
}

/** Propinas pagadas con tarjeta por día (yyyy-mm-dd), sumando los cortes del día. */
async function getPropinasPorDia(venueId: string, from: Date, to: Date): Promise<Map<string, number>> {
  const cortes = await prisma.corte.findMany({
    where: { venueId, date: { gte: from, lt: to } },
    select: { date: true, propinaEfectivo: true, propinaVisa: true, propinaMastercard: true, propinaAmex: true, totalPropinas: true },
  });
  const byDay = new Map<string, CorteAmounts>();
  for (const c of cortes) {
    const key = c.date.toISOString().slice(0, 10);
    const acc =
      byDay.get(key) ??
      { pagoEfectivo: 0, pagoOtros: 0, totalFormasPago: 0, totalVenta: 0, propinaEfectivo: 0, propinaVisa: 0, propinaMastercard: 0, propinaAmex: 0, totalPropinas: 0 };
    acc.propinaEfectivo += num(c.propinaEfectivo);
    acc.propinaVisa += num(c.propinaVisa);
    acc.propinaMastercard += num(c.propinaMastercard);
    acc.propinaAmex += num(c.propinaAmex);
    acc.totalPropinas += num(c.totalPropinas);
    byDay.set(key, acc);
  }
  return new Map([...byDay].map(([k, v]) => [k, propinasTarjeta(v)]));
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
