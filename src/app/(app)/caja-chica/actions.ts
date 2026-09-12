"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface CajaChicaActionState {
  error?: string;
  ok?: boolean;
}

/** Quién puede aprobar fondos y registrar/editar gastos de caja chica. */
const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

async function requireEditor(venueId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!PUEDEN_EDITAR.includes(user.role)) throw new Error("No autorizado");
  await assertVenueAccess(user, venueId);
  return user;
}

function revalidate() {
  revalidatePath("/caja-chica");
}

/**
 * Aprueba (crea) o edita un fondo de caja chica. Al aprobarlo se crea el
 * Egreso correspondiente en Ingresos y egresos (es dinero que sale de la
 * caja/banco principal hacia caja chica); al editar el monto o la fecha, se
 * actualiza también ese mismo egreso para que no se desincronicen.
 */
export async function saveFondoAction(
  _prev: CajaChicaActionState,
  formData: FormData,
): Promise<CajaChicaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const venueId = String(formData.get("venueId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date || Number.isNaN(date.getTime())) return { error: "Fecha inválida." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };

  try {
    const user = await requireEditor(venueId);

    if (id) {
      const existing = await prisma.cajaChicaFondo.findUnique({ where: { id } });
      if (!existing || existing.venueId !== venueId) return { error: "No encontrado." };
      await prisma.$transaction(async (tx) => {
        await tx.cajaChicaFondo.update({ where: { id }, data: { date, amount, notes } });
        if (existing.entryId) {
          await tx.financialEntry.update({
            where: { id: existing.entryId },
            data: { date, amount, description: notes ?? "Fondo de caja chica" },
          });
        }
      });
      await logAudit({
        userId: user.id,
        action: "cajaChicaFondo.editar",
        entity: "CajaChicaFondo",
        entityId: id,
        meta: { venueId, amount },
      });
    } else {
      await prisma.$transaction(async (tx) => {
        const entry = await tx.financialEntry.create({
          data: {
            venueId,
            type: "EGRESO",
            date,
            amount,
            category: "Caja chica",
            description: notes ?? "Fondo de caja chica",
            source: "MANUAL",
            createdById: user.id,
          },
        });
        const created = await tx.cajaChicaFondo.create({
          data: { venueId, date, amount, notes, entryId: entry.id, createdById: user.id },
        });
        await logAudit({
          userId: user.id,
          action: "cajaChicaFondo.aprobar",
          entity: "CajaChicaFondo",
          entityId: created.id,
          meta: { venueId, amount },
        });
      });
    }
    revalidate();
    revalidatePath("/ingresos-egresos");
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar fondo de caja chica:", err);
    return { error: "No se pudo guardar." };
  }
}

/** Elimina un fondo de caja chica y el egreso que había creado. */
export async function deleteFondoAction(id: string): Promise<CajaChicaActionState> {
  try {
    const fondo = await prisma.cajaChicaFondo.findUnique({ where: { id } });
    if (!fondo) return { error: "No encontrado." };
    const user = await requireEditor(fondo.venueId);

    await prisma.$transaction(async (tx) => {
      await tx.cajaChicaFondo.delete({ where: { id } });
      if (fondo.entryId) await tx.financialEntry.delete({ where: { id: fondo.entryId } }).catch(() => {});
    });

    await logAudit({
      userId: user.id,
      action: "cajaChicaFondo.eliminar",
      entity: "CajaChicaFondo",
      entityId: id,
      meta: { venueId: fondo.venueId, amount: fondo.amount.toString() },
    });
    revalidate();
    revalidatePath("/ingresos-egresos");
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar fondo de caja chica:", err);
    return { error: "No se pudo eliminar." };
  }
}

/** Crea o edita un gasto de caja chica (sólo desglose interno, no genera Egreso). */
export async function saveGastoAction(
  _prev: CajaChicaActionState,
  formData: FormData,
): Promise<CajaChicaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const venueId = String(formData.get("venueId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const employee = String(formData.get("employee") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!date || Number.isNaN(date.getTime())) return { error: "Fecha inválida." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };
  if (!category) return { error: "Selecciona una categoría." };
  if (!employee) return { error: "Escribe quién tomó el dinero." };

  try {
    const user = await requireEditor(venueId);

    if (id) {
      const existing = await prisma.cajaChicaGasto.findUnique({ where: { id } });
      if (!existing || existing.venueId !== venueId) return { error: "No encontrado." };
      await prisma.cajaChicaGasto.update({
        where: { id },
        data: { date, amount, category, employee, description },
      });
      await logAudit({
        userId: user.id,
        action: "cajaChicaGasto.editar",
        entity: "CajaChicaGasto",
        entityId: id,
        meta: { venueId, amount },
      });
    } else {
      const created = await prisma.cajaChicaGasto.create({
        data: { venueId, date, amount, category, employee, description, createdById: user.id },
      });
      await logAudit({
        userId: user.id,
        action: "cajaChicaGasto.crear",
        entity: "CajaChicaGasto",
        entityId: created.id,
        meta: { venueId, amount, employee },
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar gasto de caja chica:", err);
    return { error: "No se pudo guardar." };
  }
}

/** Elimina un gasto de caja chica. */
export async function deleteGastoAction(id: string): Promise<CajaChicaActionState> {
  try {
    const gasto = await prisma.cajaChicaGasto.findUnique({ where: { id } });
    if (!gasto) return { error: "No encontrado." };
    const user = await requireEditor(gasto.venueId);

    await prisma.cajaChicaGasto.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "cajaChicaGasto.eliminar",
      entity: "CajaChicaGasto",
      entityId: id,
      meta: { venueId: gasto.venueId, amount: gasto.amount.toString() },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar gasto de caja chica:", err);
    return { error: "No se pudo eliminar." };
  }
}
