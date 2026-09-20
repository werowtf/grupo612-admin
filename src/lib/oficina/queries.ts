import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface CajaChicaPorNegocio {
  venueId: string;
  venueName: string;
  fondo: number;
  gastado: number;
  disponible: number;
}

/** Caja chica de todos los negocios activos: fondo aprobado, gastado y disponible. */
export async function getCajaChicaConsolidada() {
  const venues = await prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const ids = venues.map((v) => v.id);
  const [fondos, gastos, ultimosGastos] = await Promise.all([
    prisma.cajaChicaFondo.groupBy({ by: ["venueId"], where: { venueId: { in: ids } }, _sum: { amount: true } }),
    prisma.cajaChicaGasto.groupBy({ by: ["venueId"], where: { venueId: { in: ids } }, _sum: { amount: true } }),
    prisma.cajaChicaGasto.findMany({
      where: { venueId: { in: ids } },
      orderBy: { date: "desc" },
      take: 100,
      include: { venue: { select: { name: true } } },
    }),
  ]);

  const porNegocio: CajaChicaPorNegocio[] = venues.map((v) => {
    const fondo = num(fondos.find((f) => f.venueId === v.id)?._sum.amount);
    const gastado = num(gastos.find((g) => g.venueId === v.id)?._sum.amount);
    return { venueId: v.id, venueName: v.name, fondo, gastado, disponible: fondo - gastado };
  });

  return { porNegocio, ultimosGastos };
}

export async function getOficinaNotas() {
  return prisma.oficinaNota.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
