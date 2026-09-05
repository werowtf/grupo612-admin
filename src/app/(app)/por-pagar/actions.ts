"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
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

export async function createCuentaPorPagarAction(
  _prev: CuentaPorPagarActionState,
  formData: FormData,
): Promise<CuentaPorPagarActionState> {
  const venueId = String(formData.get("venueId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  const concept = String(formData.get("concept") ?? "").trim();
  const amount = Number(formData.get("amount"));

  if (!date || Number.isNaN(date.getTime())) return { error: "Fecha inválida." };
  if (!concept) return { error: "Escribe el concepto." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "El monto debe ser mayor a cero." };

  try {
    const user = await requireEditor(venueId);
    const created = await prisma.cuentaPorPagar.create({
      data: { venueId, date, concept, amount, createdById: user.id },
    });
    await logAudit({
      userId: user.id,
      action: "cuentaPorPagar.create",
      entity: "CuentaPorPagar",
      entityId: created.id,
      meta: { venueId, concept, amount },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al agregar cuenta por pagar:", err);
    return { error: "No se pudo agregar." };
  }
}

export async function markCuentaPagadaAction(id: string): Promise<CuentaPorPagarActionState> {
  try {
    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id } });
    if (!cuenta) return { error: "No encontrado." };
    const user = await requireEditor(cuenta.venueId);

    await prisma.cuentaPorPagar.update({ where: { id }, data: { paidAt: new Date() } });
    await logAudit({
      userId: user.id,
      action: "cuentaPorPagar.pagar",
      entity: "CuentaPorPagar",
      entityId: id,
      meta: { venueId: cuenta.venueId, concept: cuenta.concept, amount: cuenta.amount.toString() },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al marcar como pagado:", err);
    return { error: "No se pudo marcar como pagado." };
  }
}
