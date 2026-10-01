import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface CajaChicaResumen {
  fondoTotal: number;
  gastadoTotal: number;
  reembolsadoTotal: number;
  disponible: number;
}

/**
 * Fondo total aprobado - gastos pendientes de reponer, para saber cuánto
 * queda disponible en caja chica. Un gasto marcado como repuesto (el
 * empleado devolvió el dinero) deja de contar contra el disponible.
 */
export async function getCajaChicaResumen(venueId: string): Promise<CajaChicaResumen> {
  const [fondosAgg, pendienteAgg, reembolsadoAgg] = await Promise.all([
    prisma.cajaChicaFondo.aggregate({ where: { venueId }, _sum: { amount: true } }),
    prisma.cajaChicaGasto.aggregate({ where: { venueId, reimbursed: false }, _sum: { amount: true } }),
    prisma.cajaChicaGasto.aggregate({ where: { venueId, reimbursed: true }, _sum: { amount: true } }),
  ]);
  const fondoTotal = num(fondosAgg._sum.amount);
  const gastadoTotal = num(pendienteAgg._sum.amount);
  const reembolsadoTotal = num(reembolsadoAgg._sum.amount);
  return { fondoTotal, gastadoTotal, reembolsadoTotal, disponible: fondoTotal - gastadoTotal };
}

export async function getCajaChicaFondos(venueId: string) {
  return prisma.cajaChicaFondo.findMany({ where: { venueId }, orderBy: { date: "desc" } });
}

export async function getCajaChicaGastos(venueId: string) {
  return prisma.cajaChicaGasto.findMany({ where: { venueId }, orderBy: { date: "desc" } });
}
