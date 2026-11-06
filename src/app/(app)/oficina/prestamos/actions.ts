"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { PAYMENT_METHODS } from "@/lib/entries/config";
import { crearPrestamo, reembolsarPrestamo, PrestamoError } from "@/lib/prestamos/service";
import type { PaymentMethod } from "@/generated/prisma/enums";

export interface PrestamoActionState {
  error?: string;
  ok?: boolean;
}

/** Los préstamos entre negocios los maneja cualquier usuario con acceso a Oficina. */
async function requireOficina() {
  const user = await getCurrentUser();
  if (!user) throw new PrestamoError("Sesión expirada.");
  if (!user.canAccessOficina) throw new PrestamoError("No autorizado.");
  return user;
}

function parseMethod(v: unknown): PaymentMethod | null {
  return typeof v === "string" && (PAYMENT_METHODS as string[]).includes(v) ? (v as PaymentMethod) : null;
}

function revalidate() {
  revalidatePath("/oficina/prestamos");
  revalidatePath("/ingresos");
  revalidatePath("/egresos");
}

export async function prestarAction(input: {
  lenderVenueId: string;
  borrowerVenueId: string;
  amount: number;
  paymentMethod: string;
}): Promise<PrestamoActionState> {
  try {
    const user = await requireOficina();
    const paymentMethod = parseMethod(input.paymentMethod);
    if (!paymentMethod) return { error: "Elige la forma de pago." };

    const p = await crearPrestamo({
      lenderVenueId: input.lenderVenueId,
      borrowerVenueId: input.borrowerVenueId,
      amount: Number(input.amount),
      paymentMethod,
      userId: user.id,
    });
    await logAudit({
      userId: user.id,
      action: "prestamo.crear",
      entity: "PrestamoNegocio",
      entityId: p.id,
      meta: { amount: Number(p.amount), lenderVenueId: p.lenderVenueId, borrowerVenueId: p.borrowerVenueId, paymentMethod },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    if (err instanceof PrestamoError) return { error: err.message };
    console.error("Error al registrar préstamo:", err);
    return { error: "No se pudo registrar el préstamo." };
  }
}

export async function reembolsarAction(input: { id: string; paymentMethod: string }): Promise<PrestamoActionState> {
  try {
    const user = await requireOficina();
    const paymentMethod = parseMethod(input.paymentMethod);
    if (!paymentMethod) return { error: "Elige la forma de pago." };

    const p = await reembolsarPrestamo({ id: input.id, paymentMethod, userId: user.id });
    await logAudit({
      userId: user.id,
      action: "prestamo.reembolsar",
      entity: "PrestamoNegocio",
      entityId: p.id,
      meta: { amount: Number(p.amount), lenderVenueId: p.lenderVenueId, borrowerVenueId: p.borrowerVenueId, paymentMethod },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    if (err instanceof PrestamoError) return { error: err.message };
    console.error("Error al reembolsar préstamo:", err);
    return { error: "No se pudo reembolsar el préstamo." };
  }
}
