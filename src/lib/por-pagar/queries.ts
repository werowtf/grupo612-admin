import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/**
 * Suma de propinas por pagar de todos los cortes del negocio. No hay manera
 * de "saldar" un corte individual todavía — es un total corriente, no una
 * lista de pendientes por corte.
 */
export async function getPropinasPendientes(venueId: string): Promise<number> {
  const agg = await prisma.corte.aggregate({
    where: { venueId },
    _sum: { propinasPorPagar: true },
  });
  return num(agg._sum.propinasPorPagar);
}

export async function getCuentasPorPagar(venueId: string) {
  return prisma.cuentaPorPagar.findMany({
    where: { venueId, paidAt: null },
    orderBy: { date: "asc" },
  });
}
