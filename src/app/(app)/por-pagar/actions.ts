"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod, UserRole } from "@/generated/prisma/enums";
import { PAYMENT_METHODS } from "@/lib/entries/config";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface CuentaPorPagarActionState {
  error?: string;
  ok?: boolean;
}

/** Quién puede agregar/marcar pagadas las cuentas por pagar. */
const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

async function requireEditor(venueId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!PUEDEN_EDITAR.includes(user.role)) throw new Error("No autorizado");
  await assertVenueAccess(user, venueId);
  return user;
}

function revalidate() {
  revalidatePath("/por-pagar");
}

/** Crea o edita una cuenta por pagar (según venga o no un `id` en el form). */
export async function createCuentaPorPagarAction(
  _prev: CuentaPorPagarActionState,
  formData: FormData,
): Promise<CuentaPorPagarActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const venueId = String(formData.get("venueId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  const concept = String(formData.get("concept") ?? "").trim();
  const amount = Number(formData.get("amount"));
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const paymentMethodRaw = String(formData.get("paymentMethod") ?? "");
  const paymentMethod = PAYMENT_METHODS.includes(paymentMethodRaw as PaymentMethod)
    ? (paymentMethodRaw as PaymentMethod)
    : null;

  if (!date || Number.isNaN(date.getTime())) return { error: "Fecha inválida." };
  if (!concept) return { error: "Escribe el concepto." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };

  try {
    const user = await requireEditor(venueId);

    if (id) {
      const existing = await prisma.cuentaPorPagar.findUnique({ where: { id } });
      if (!existing || existing.venueId !== venueId) return { error: "No encontrado." };
      if (existing.paidAt) return { error: "Esta cuenta ya está pagada; no se puede editar." };
      await prisma.cuentaPorPagar.update({
        where: { id },
        data: { date, concept, amount, supplier, paymentMethod },
      });
      await logAudit({
        userId: user.id,
        action: "cuentaPorPagar.editar",
        entity: "CuentaPorPagar",
        entityId: id,
        meta: { venueId, concept, amount },
      });
    } else {
      const created = await prisma.cuentaPorPagar.create({
        data: { venueId, date, concept, amount, supplier, paymentMethod, createdById: user.id },
      });
      await logAudit({
        userId: user.id,
        action: "cuentaPorPagar.create",
        entity: "CuentaPorPagar",
        entityId: created.id,
        meta: { venueId, concept, amount },
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar cuenta por pagar:", err);
    return { error: "No se pudo guardar." };
  }
}

/** Elimina una cuenta por pagar pendiente (las pagadas no se listan aquí). */
export async function deleteCuentaPorPagarAction(id: string): Promise<CuentaPorPagarActionState> {
  try {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id } });
    if (!cuenta) return { error: "No encontrado." };
    if (cuenta.paidAt) return { error: "Esta cuenta ya está pagada; no se puede eliminar." };
    const user = await requireEditor(cuenta.venueId);

    await prisma.cuentaPorPagar.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "cuentaPorPagar.eliminar",
      entity: "CuentaPorPagar",
      entityId: id,
      meta: { venueId: cuenta.venueId, concept: cuenta.concept, amount: cuenta.amount.toString() },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar cuenta por pagar:", err);
    return { error: "No se pudo eliminar." };
  }
}

/**
 * Marca una cuenta como pagada y crea el Egreso correspondiente en Ingresos
 * y egresos del mismo negocio, para que el pago quede reflejado ahí (antes
 * sólo se guardaba paidAt y el egreso nunca se registraba).
 */
export async function markCuentaPagadaAction(id: string): Promise<CuentaPorPagarActionState> {
  try {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id } });
    if (!cuenta) return { error: "No encontrado." };
    if (cuenta.paidAt) return { error: "Esta cuenta ya está pagada." };
    const user = await requireEditor(cuenta.venueId);

    await prisma.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: {
          venueId: cuenta.venueId,
          type: "EGRESO",
          date: new Date(),
          amount: cuenta.amount,
          category: "Otros",
          description: cuenta.concept,
          supplier: cuenta.supplier,
          paymentMethod: cuenta.paymentMethod ?? "EFECTIVO",
          source: "SISTEMA",
          createdById: user.id,
        },
      });
      await tx.cuentaPorPagar.update({
        where: { id },
        data: { paidAt: new Date(), entryId: entry.id },
      });
    });

    await logAudit({
      userId: user.id,
      action: "cuentaPorPagar.pagar",
      entity: "CuentaPorPagar",
      entityId: id,
      meta: { venueId: cuenta.venueId, concept: cuenta.concept, amount: cuenta.amount.toString() },
    });
    revalidate();
    revalidatePath("/ingresos-egresos");
    return { ok: true };
  } catch (err) {
    console.error("Error al marcar como pagado:", err);
    return { error: "No se pudo marcar como pagado." };
  }
}

/**
 * Marca la propina de un corte como Pendiente/Pagada. No crea un Egreso en
 * Ingresos y egresos: el efectivo que sale ya está reflejado en el propio
 * corte (Efectivo declarado / Sobrante-Faltante) — esto sólo evita que la
 * propina siga sumando en el total pendiente una vez que ya se le pagó al
 * personal.
 */
export async function updatePropinaCorteAction(
  corteId: string,
  paid: boolean,
): Promise<CuentaPorPagarActionState> {
  try {
    const corte = await prisma.corte.findUnique({ where: { id: corteId } });
    if (!corte) return { error: "Corte no encontrado." };
    const user = await requireEditor(corte.venueId);

    await prisma.corte.update({
      where: { id: corteId },
      data: { propinasPagadas: paid, propinasPagadasAt: paid ? new Date() : null },
    });

    await logAudit({
      userId: user.id,
      action: paid ? "corte.propinasPagadas" : "corte.propinasPendientes",
      entity: "Corte",
      entityId: corteId,
      meta: { venueId: corte.venueId, amount: corte.propinasPorPagar.toString() },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al actualizar el estado de la propina:", err);
    return { error: "No se pudo actualizar." };
  }
}
