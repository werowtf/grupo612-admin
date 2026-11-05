import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/** "620 ARTURO, 37.50 CORTESÍA": monto (sin decimales si es entero) y nombre, como en el Excel. */
function creditSummary(items: { amount: unknown; description: string }[]): string {
  return items
    .map((i) => {
      const n = num(i.amount as { toString(): string });
      return `${Number.isInteger(n) ? n : n.toFixed(2)} ${i.description.trim().toUpperCase()}`;
    })
    .join(", ");
}

/** Medianoche UTC del día calendario de una fecha (los cortes se guardan con hora local). */
function calendarDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Recalcula el renglón de venta diaria de un (negocio, día) a partir de los
 * cortes de caja de ese día. El corte es la fuente de la verdad: efectivo,
 * tarjeta y el desglose comida/bebida salen de ahí, no se capturan dos veces.
 *
 * - "Tarjeta" agrupa lo cobrado que no fue efectivo ni crédito (visa/
 *   mastercard/amex/vales), porque el libro del contador sólo distingue tres
 *   formas de pago.
 * - "Crédito" es lo que el corte registra como "Otros" (crédito, cortesías,
 *   consumos de socios, etc.: ver el desglose CorteCredito) más lo vendido
 *   pero no cobrado ese día (venta total menos formas de pago), si lo hubiera.
 *   Antes "Otros" se sumaba a Tarjeta y el crédito siempre salía en $0.
 * - `statusCredito` (a quién se le dio crédito) se arma solo con el desglose
 *   de crédito de los cortes del día, en el formato del Excel: "620 ARTURO,
 *   4105 DJ". Si los cortes no traen desglose, se conserva la nota que ya
 *   existiera (captura manual).
 *
 * Si el día ya no tiene ningún corte (se borró), se elimina el renglón
 * derivado — pero sólo si sigue marcado como CORTE; una captura manual nunca
 * se borra sola.
 */
export async function syncDailySaleFromCortes(venueId: string, date: Date): Promise<void> {
  const day = calendarDay(date);
  const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);

  const cortes = await prisma.corte.findMany({
    where: { venueId, date: { gte: day, lt: nextDay } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: { creditos: { orderBy: { createdAt: "asc" } } },
  });

  if (cortes.length === 0) {
    await prisma.dailySale.deleteMany({ where: { venueId, date: day, source: "CORTE" } });
    return;
  }

  let pagoEfectivo = 0;
  let pagoOtros = 0;
  let totalFormasPago = 0;
  let totalVenta = 0;
  let ventaAlimentos = 0;
  let ventaBebidas = 0;
  for (const c of cortes) {
    pagoEfectivo += num(c.pagoEfectivo);
    pagoOtros += num(c.pagoOtros);
    totalFormasPago += num(c.totalFormasPago);
    totalVenta += num(c.totalVenta);
    ventaAlimentos += num(c.ventaAlimentos);
    ventaBebidas += num(c.ventaBebidas);
  }

  const statusCredito = creditSummary(cortes.flatMap((c) => c.creditos)) || undefined;
  const efectivo = pagoEfectivo;
  const tarjeta = Math.max(0, totalFormasPago - pagoEfectivo - pagoOtros);
  const credito = pagoOtros + Math.max(0, totalVenta - totalFormasPago);

  await prisma.dailySale.upsert({
    where: { venueId_date: { venueId, date: day } },
    create: {
      venueId,
      date: day,
      source: "CORTE",
      efectivo,
      tarjeta,
      credito,
      comida: ventaAlimentos,
      bebida: ventaBebidas,
      statusCredito,
    },
    update: {
      source: "CORTE",
      efectivo,
      tarjeta,
      credito,
      comida: ventaAlimentos,
      bebida: ventaBebidas,
      // Sin desglose en los cortes (undefined) no se toca la nota manual existente.
      statusCredito,
    },
  });
}
