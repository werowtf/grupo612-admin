import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface CajaChicaResumen {
  fondoTotal: number;
  gastadoTotal: number;
  disponible: number;
}

/** Fondo total aprobado - gastado, para saber cuánto queda disponible en caja chica. */
export async function getCajaChicaResumen(venueId: string): Promise<CajaChicaResumen> {
  const [fondosAgg, gastosAgg] = await Promise.all([
    prisma.cajaChicaFondo.aggregate({ where: { venueId }, _sum: { amount: true } }),
    prisma.cajaChicaGasto.aggregate({ where: { venueId }, _sum: { amount: true } }),
  ]);
  const fondoTotal = num(fondosAgg._sum.amount);
  const gastadoTotal = num(gastosAgg._sum.amount);
  return { fondoTotal, gastadoTotal, disponible: fondoTotal - gastadoTotal };
}

export async function getCajaChicaFondos(venueId: string) {
  return prisma.cajaChicaFondo.findMany({ where: { venueId }, orderBy: { date: "desc" } });
}

export async function getCajaChicaGastos(venueId: string) {
  return prisma.cajaChicaGasto.findMany({ where: { venueId }, orderBy: { date: "desc" } });
}
