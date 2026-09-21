"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
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

export async function saveOficinaGastoAction(
  _prev: CajaChicaActionState,
  formData: FormData,
): Promise<CajaChicaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const date = parseDate(formData);
  const amount = Number(formData.get("amount"));
  const category = String(formData.get("category") ?? "").trim();
  const employee = String(formData.get("employee") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!date) return { error: "Fecha inválida." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };
  if (!category) return { error: "Selecciona una categoría." };
  if (!employee) return { error: "Escribe quién tomó el dinero." };

  try {
    const user = await requireOficina();
    if (id) {
      await prisma.oficinaCajaChicaGasto.update({
        where: { id },
        data: { date, amount, category, employee, description },
      });
    } else {
      const created = await prisma.oficinaCajaChicaGasto.create({
        data: { date, amount, category, employee, description, createdById: user.id },
      });
      await logAudit({
        userId: user.id,
        action: "oficinaCajaChicaGasto.crear",
        entity: "OficinaCajaChicaGasto",
        entityId: created.id,
        meta: { amount, employee },
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar gasto de caja chica de Oficina:", err);
    return { error: "No se pudo guardar." };
  }
}

export async function deleteOficinaGastoAction(id: string): Promise<CajaChicaActionState> {
  try {
    const user = await requireOficina();
    await prisma.oficinaCajaChicaGasto.delete({ where: { id } });
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
