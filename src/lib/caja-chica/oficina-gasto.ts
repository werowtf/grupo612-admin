import "server-only";
import { prisma } from "@/lib/prisma";

export class OficinaGastoError extends Error {}

export interface OficinaGastoInput {
  id?: string | null;
  /** yyyy-mm-dd */
  dateStr: string;
  amount: number;
  category: string;
  employee: string;
  description: string | null;
  /** Negocio al que se le carga el gasto; null = sólo Oficina. */
  venueId: string | null;
  userId: string;
}

/** Los movimientos del libro se guardan a mediodía del día (como el resto de los ingresos/egresos). */
const entryDate = (dateStr: string) => new Date(`${dateStr}T12:00:00`);

function entryFields(i: OficinaGastoInput, venueId: string) {
  return {
    venueId,
    date: entryDate(i.dateStr),
    amount: i.amount,
    category: i.category,
    description: i.description ? `Caja chica Oficina: ${i.description}` : "Caja chica Oficina",
    supplier: i.employee,
  };
}

/**
 * Crea o edita un gasto de la caja chica de Oficina. Si tiene negocio asignado
 * se mantiene un Egreso en ese negocio: se crea al asignarlo, se actualiza al
 * editar (incluido el cambio de negocio) y se elimina si se quita el negocio.
 */
export async function guardarOficinaGasto(i: OficinaGastoInput) {
  if (i.venueId) {
    const venue = await prisma.venue.findFirst({ where: { id: i.venueId, active: true }, select: { id: true } });
    if (!venue) throw new OficinaGastoError("Negocio no encontrado.");
  }
  const date = new Date(`${i.dateStr}T00:00:00.000Z`);
  const base = { date, amount: i.amount, category: i.category, employee: i.employee, description: i.description };

  return prisma.$transaction(async (tx) => {
    if (!i.id) {
      let entryId: string | null = null;
      if (i.venueId) {
        const entry = await tx.financialEntry.create({
          data: { ...entryFields(i, i.venueId), type: "EGRESO", paymentMethod: "EFECTIVO", source: "SISTEMA", createdById: i.userId },
        });
        entryId = entry.id;
      }
      return tx.oficinaCajaChicaGasto.create({ data: { ...base, venueId: i.venueId, entryId, createdById: i.userId } });
    }

    const existing = await tx.oficinaCajaChicaGasto.findUnique({ where: { id: i.id } });
    if (!existing) throw new OficinaGastoError("Gasto no encontrado.");

    let entryId = existing.entryId;
    if (i.venueId && existing.entryId) {
      await tx.financialEntry.update({ where: { id: existing.entryId }, data: entryFields(i, i.venueId) });
    } else if (i.venueId && !existing.entryId) {
      const entry = await tx.financialEntry.create({
        data: { ...entryFields(i, i.venueId), type: "EGRESO", paymentMethod: "EFECTIVO", source: "SISTEMA", createdById: i.userId },
      });
      entryId = entry.id;
    } else if (!i.venueId && existing.entryId) {
      await tx.financialEntry.delete({ where: { id: existing.entryId } }).catch(() => {});
      entryId = null;
    }
    return tx.oficinaCajaChicaGasto.update({ where: { id: i.id }, data: { ...base, venueId: i.venueId, entryId } });
  });
}

/** Elimina el gasto y, si lo tenía, su egreso en el negocio. */
export async function eliminarOficinaGasto(id: string) {
  return prisma.$transaction(async (tx) => {
    const gasto = await tx.oficinaCajaChicaGasto.delete({ where: { id } });
    if (gasto.entryId) await tx.financialEntry.delete({ where: { id: gasto.entryId } }).catch(() => {});
    return gasto;
  });
}
