import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
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
 * - "Tarjeta" agrupa todo lo cobrado que no fue efectivo (visa/mastercard/
 *   amex/vales/otros), porque el libro del contador sólo distingue tres
 *   formas de pago.
 * - "Crédito" es lo vendido pero no cobrado ese día (venta total menos lo
 *   efectivamente cobrado), cuando aplica.
 * - `statusCredito` (las notas de a quién se le dio crédito) no vive en el
 *   corte, así que se conserva tal cual si ya existía.
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
  });

  if (cortes.length === 0) {
    await prisma.dailySale.deleteMany({ where: { venueId, date: day, source: "CORTE" } });
    return;
  }

  let pagoEfectivo = 0;
  let totalFormasPago = 0;
  let totalVenta = 0;
  let ventaAlimentos = 0;
  let ventaBebidas = 0;
  for (const c of cortes) {
    pagoEfectivo += num(c.pagoEfectivo);
    totalFormasPago += num(c.totalFormasPago);
    totalVenta += num(c.totalVenta);
    ventaAlimentos += num(c.ventaAlimentos);
    ventaBebidas += num(c.ventaBebidas);
  }

  const efectivo = pagoEfectivo;
  const tarjeta = Math.max(0, totalFormasPago - pagoEfectivo);
  const credito = Math.max(0, totalVenta - totalFormasPago);

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
    },
    update: {
      source: "CORTE",
      efectivo,
      tarjeta,
      credito,
      comida: ventaAlimentos,
      bebida: ventaBebidas,
      // statusCredito no se toca: son notas manuales que el corte no trae.
    },
  });
}
