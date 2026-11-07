import "server-only";
import { prisma } from "@/lib/prisma";

export class PeriodoError extends Error {}

const dayUtc = (dateStr: string) => new Date(`${dateStr}T00:00:00.000Z`);

const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

function parse(dateStr: string, fondoFijo: number) {
  const startDate = dayUtc(dateStr);
  if (Number.isNaN(startDate.getTime())) throw new PeriodoError("Fecha inválida.");
  const amount = Math.round(fondoFijo * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) throw new PeriodoError("El fondo fijo debe ser mayor a cero.");
  return { startDate, amount };
}

/**
 * Cierra el periodo vigente y abre uno nuevo: desde `dateStr` los fondos y gastos
 * pertenecen al periodo nuevo (el anterior termina el día previo). El periodo
 * nuevo arranca con un fondo fijo autorizado.
 */
export async function abrirPeriodo(input: { dateStr: string; fondoFijo: number; notes: string | null; userId: string }) {
  const { startDate, amount } = parse(input.dateStr, input.fondoFijo);
  const latest = await prisma.oficinaCajaChicaPeriodo.findFirst({ orderBy: { startDate: "desc" } });
  if (latest && startDate <= latest.startDate) {
    throw new PeriodoError(`La fecha de inicio debe ser posterior al inicio del periodo vigente (${fmt(latest.startDate)}).`);
  }
  return prisma.oficinaCajaChicaPeriodo.create({
    data: { startDate, fondoFijo: amount, notes: input.notes, createdById: input.userId },
  });
}

/** Corrige el periodo vigente (fecha de inicio, fondo fijo o notas). Los anteriores no se editan. */
export async function editarPeriodoVigente(input: {
  id: string;
  dateStr: string;
  fondoFijo: number;
  notes: string | null;
}) {
  const { startDate, amount } = parse(input.dateStr, input.fondoFijo);
  const [latest, previous] = await prisma.oficinaCajaChicaPeriodo.findMany({ orderBy: { startDate: "desc" }, take: 2 });
  if (!latest || latest.id !== input.id) throw new PeriodoError("Sólo se puede editar el periodo vigente.");
  if (previous && startDate <= previous.startDate) {
    throw new PeriodoError(`La fecha de inicio debe ser posterior al inicio del periodo anterior (${fmt(previous.startDate)}).`);
  }
  return prisma.oficinaCajaChicaPeriodo.update({
    where: { id: input.id },
    data: { startDate, fondoFijo: amount, notes: input.notes },
  });
}
