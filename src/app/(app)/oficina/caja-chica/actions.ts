"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { guardarOficinaGasto, eliminarOficinaGasto, OficinaGastoError } from "@/lib/caja-chica/oficina-gasto";
import type { CajaChicaActionState } from "@/app/(app)/caja-chica/actions";

/** La caja chica de Oficina la administra cualquier usuario con acceso a Oficina. */
async function requireOficina() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!user.canAccessOficina) throw new Error("No autorizado");
  return user;
}

function revalidate() {
  revalidatePath("/oficina/caja-chica");
  revalidatePath("/egresos");
}

function parseDate(formData: FormData) {
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export async function saveOficinaFondoAction(
  _prev: CajaChicaActionState,
  formData: FormData,
): Promise<CajaChicaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const date = parseDate(formData);
  const amount = Number(formData.get("amount"));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!date) return { error: "Fecha inválida." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };

  try {
    const user = await requireOficina();
    if (id) {
      await prisma.oficinaCajaChicaFondo.update({ where: { id }, data: { date, amount, notes } });
    } else {
      const created = await prisma.oficinaCajaChicaFondo.create({
        data: { date, amount, notes, createdById: user.id },
      });
      await logAudit({
        userId: user.id,
        action: "oficinaCajaChicaFondo.aprobar",
        entity: "OficinaCajaChicaFondo",
        entityId: created.id,
        meta: { amount },
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar fondo de caja chica de Oficina:", err);
    return { error: "No se pudo guardar." };
  }
}

export async function deleteOficinaFondoAction(id: string): Promise<CajaChicaActionState> {
  try {
    const user = await requireOficina();
    await prisma.oficinaCajaChicaFondo.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "oficinaCajaChicaFondo.eliminar",
      entity: "OficinaCajaChicaFondo",
      entityId: id,
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar fondo de caja chica de Oficina:", err);
    return { error: "No se pudo eliminar." };
  }
}

/**
 * Crea o edita un gasto de la caja chica de Oficina. Puede asignarse a un negocio
 * (campo `venueId`, "none" = sólo Oficina): con negocio se registra un Egreso en él.
 */
export async function saveOficinaGastoAction(
  _prev: CajaChicaActionState,
  formData: FormData,
): Promise<CajaChicaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const dateStr = String(formData.get("date") ?? "");
  const date = parseDate(formData);
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const employee = String(formData.get("employee") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const rawVenue = String(formData.get("venueId") ?? "").trim();
  const venueId = rawVenue && rawVenue !== "none" ? rawVenue : null;

  if (!date) return { error: "Fecha inválida." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };
  if (!category) return { error: "Selecciona una categoría." };
  if (!employee) return { error: "Escribe quién tomó el dinero." };

  try {
    const user = await requireOficina();
    const gasto = await guardarOficinaGasto({ id, dateStr, amount, category, employee, description, venueId, userId: user.id });
    if (!id) {
      await logAudit({
        userId: user.id,
        action: "oficinaCajaChicaGasto.crear",
        entity: "OficinaCajaChicaGasto",
        entityId: gasto.id,
        meta: { amount, employee, ...(venueId ? { venueId } : {}) },
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    if (err instanceof OficinaGastoError) return { error: err.message };
    console.error("Error al guardar gasto de caja chica de Oficina:", err);
    return { error: "No se pudo guardar." };
  }
}

/** Marca (o desmarca) un gasto de caja chica de Oficina como repuesto. */
export async function setOficinaGastoReembolsadoAction(
  id: string,
  reimbursed: boolean,
): Promise<CajaChicaActionState> {
  try {
    const user = await requireOficina();
    const gasto = await prisma.oficinaCajaChicaGasto.update({
      where: { id },
      data: { reimbursed, reimbursedAt: reimbursed ? new Date() : null },
    });
    await logAudit({
      userId: user.id,
      action: reimbursed ? "oficinaCajaChicaGasto.reembolsar" : "oficinaCajaChicaGasto.pendiente",
      entity: "OficinaCajaChicaGasto",
      entityId: id,
      meta: { amount: gasto.amount.toString() },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al actualizar el reembolso del gasto de Oficina:", err);
    return { error: "No se pudo actualizar." };
  }
}

export async function deleteOficinaGastoAction(id: string): Promise<CajaChicaActionState> {
  try {
    const user = await requireOficina();
    await eliminarOficinaGasto(id);
    await logAudit({
      userId: user.id,
      action: "oficinaCajaChicaGasto.eliminar",
      entity: "OficinaCajaChicaGasto",
      entityId: id,
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar gasto de caja chica de Oficina:", err);
    return { error: "No se pudo eliminar." };
  }
}
