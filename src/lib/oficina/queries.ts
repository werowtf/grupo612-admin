import "server-only";
import { prisma } from "@/lib/prisma";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

/** Caja chica propia de Oficina (independiente de la de los negocios). */
export async function getOficinaCajaChica() {
  const [fondos, gastos] = await Promise.all([
    prisma.oficinaCajaChicaFondo.findMany({ orderBy: { date: "desc" } }),
    prisma.oficinaCajaChicaGasto.findMany({ orderBy: { date: "desc" } }),
  ]);
  const fondoTotal = fondos.reduce((s, f) => s + num(f.amount), 0);
  const gastadoTotal = gastos.reduce((s, g) => s + num(g.amount), 0);
  return {
    resumen: { fondoTotal, gastadoTotal, disponible: fondoTotal - gastadoTotal },
    fondos,
    gastos,
  };
}

export async function getOficinaNotas() {
  return prisma.oficinaNota.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
