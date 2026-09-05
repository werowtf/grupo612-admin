import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
}

export interface CostoVentaRubro {
  costo: number;
  venta: number;
  /** null si no hay venta registrada ese mes (evita dividir entre cero). */
  pct: number | null;
}

export interface CostoVentaMes {
  cocina: CostoVentaRubro;
  barra: CostoVentaRubro;
  general: CostoVentaRubro;
}

function rubro(costo: number, venta: number): CostoVentaRubro {
  return { costo, venta, pct: venta > 0 ? (costo / venta) * 100 : null };
}

/**
 * % Costo de venta = egresos de "Cocina"/"Barra" (ingredientes, insumos) entre
 * la venta de comida/bebida del mismo mes. Los conceptos "Cocina"/"Barra" y los
 * campos comida/bebida de venta diaria ya existen para esto — no hace falta
 * ningún dato nuevo, sólo cruzarlos.
 */
export async function getCostoVentaMes(venueId: string, year: number, month: number): Promise<CostoVentaMes> {
  const date = monthRange(year, month);

  const [costoCocina, costoBarra, ventas] = await Promise.all([
    prisma.financialEntry.aggregate({
      _sum: { amount: true },
      where: { venueId, type: "EGRESO", category: "Cocina", date },
    }),
    prisma.financialEntry.aggregate({
      _sum: { amount: true },
      where: { venueId, type: "EGRESO", category: "Barra", date },
    }),
    prisma.dailySale.aggregate({
      _sum: { comida: true, bebida: true },
      where: { venueId, date },
    }),
  ]);

  const gastoCocina = num(costoCocina._sum.amount);
  const gastoBarra = num(costoBarra._sum.amount);
  const ventaComida = num(ventas._sum.comida);
  const ventaBebida = num(ventas._sum.bebida);

  return {
    cocina: rubro(gastoCocina, ventaComida),
    barra: rubro(gastoBarra, ventaBebida),
    general: rubro(gastoCocina + gastoBarra, ventaComida + ventaBebida),
  };
}
