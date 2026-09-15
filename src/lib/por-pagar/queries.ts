import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/** Suma de propinas por pagar aún no saldadas (cortes con propinasPagadas=false). */
export async function getPropinasPendientes(venueId: string): Promise<number> {
  const agg = await prisma.corte.aggregate({
    where: { venueId, propinasPagadas: false },
    _sum: { propinasPorPagar: true },
  });
  return num(agg._sum.propinasPorPagar);
}

export interface PropinaCorteRow {
  id: string;
  date: Date;
  amount: number;
  paid: boolean;
  paidAt: Date | null;
  folioCorteZ: string | null;
}

/** Un renglón por corte con propina > 0, para la tabla de "Por pagar". */
export async function getPropinasPorCorte(venueId: string): Promise<PropinaCorteRow[]> {
  const cortes = await prisma.corte.findMany({
    where: { venueId, propinasPorPagar: { gt: 0 } },
    orderBy: { date: "desc" },
    select: { id: true, date: true, propinasPorPagar: true, propinasPagadas: true, propinasPagadasAt: true, folioCorteZ: true },
  });
  return cortes.map((c) => ({
    id: c.id,
    date: c.date,
    amount: num(c.propinasPorPagar),
    paid: c.propinasPagadas,
    paidAt: c.propinasPagadasAt,
    folioCorteZ: c.folioCorteZ,
  }));
}

export async function getCuentasPorPagar(venueId: string) {
  return prisma.cuentaPorPagar.findMany({
    where: { venueId, paidAt: null },
    orderBy: { date: "asc" },
  });
}
