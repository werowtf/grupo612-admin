import "server-only";
import { prisma } from "@/lib/prisma";
import { getDailySales } from "@/lib/daily-sales/queries";
import { COMISION_NOMINA_ADMIN } from "./config";

export interface ComisionRow {
  slug: string;
  venue: string;
  porcentaje: number;
  dias: number;
  efectivo: number;
  tarjeta: number;
  credito: number;
  /** Venta total del mes (efectivo + tarjeta + crédito): la base de la comisión. */
  base: number;
  comision: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Comisión de nómina administrativa de cada negocio en el mes: venta total del
 * mes (efectivo + tarjeta + crédito de la venta diaria, con propinas incluidas,
 * como el libro contable) × el porcentaje del negocio.
 */
export async function getComisionesMes(year: number, month: number): Promise<ComisionRow[]> {
  const venues = await prisma.venue.findMany({
    where: { active: true, slug: { in: Object.keys(COMISION_NOMINA_ADMIN) } },
    select: { id: true, name: true, slug: true },
  });

  const rows = await Promise.all(
    venues.map(async (v): Promise<ComisionRow> => {
      const { rows: days } = await getDailySales(v.id, year, month);
      let efectivo = 0;
      let tarjeta = 0;
      let credito = 0;
      for (const d of days) {
        efectivo += Number(d.efectivo);
        tarjeta += Number(d.tarjeta);
        credito += Number(d.credito);
      }
      const base = efectivo + tarjeta + credito;
      const porcentaje = COMISION_NOMINA_ADMIN[v.slug];
      return {
        slug: v.slug,
        venue: v.name,
        porcentaje,
        dias: days.length,
        efectivo: r2(efectivo),
        tarjeta: r2(tarjeta),
        credito: r2(credito),
        base: r2(base),
        comision: r2(base * porcentaje),
      };
    }),
  );

  // Mismo orden que la configuración (Rooftop, UNO Bar, Biznaga).
  const order = Object.keys(COMISION_NOMINA_ADMIN);
  return rows.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
}
