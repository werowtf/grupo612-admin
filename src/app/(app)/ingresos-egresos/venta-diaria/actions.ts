"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface DailySaleActionState {
  error?: string;
  ok?: boolean;
}

/** Quién puede capturar la venta diaria. */
const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

async function requireEditor(venueId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!PUEDEN_EDITAR.includes(user.role)) throw new Error("No autorizado");
  await assertVenueAccess(user, venueId);
  return user;
}

function decimalOrNull(raw: FormDataEntryValue | null): number {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function revalidate() {
  revalidatePath("/ingresos-egresos/venta-diaria");
  revalidatePath("/ingresos-egresos");
}

/**
 * Crea o actualiza la venta del día. Es un upsert por (venueId, date): capturar
 * dos veces la misma fecha corrige el renglón en vez de duplicarlo, igual que
 * si se reabriera la celda del Excel del contador.
 */
export async function saveDailySaleAction(
  _prev: DailySaleActionState,
  formData: FormData,
): Promise<DailySaleActionState> {
  const venueId = String(formData.get("venueId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const date = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : null;
  if (!date || Number.isNaN(date.getTime())) return { error: "Fecha inválida." };

  const efectivo = decimalOrNull(formData.get("efectivo"));
  const tarjeta = decimalOrNull(formData.get("tarjeta"));
  const credito = decimalOrNull(formData.get("credito"));
  const comida = decimalOrNull(formData.get("comida"));
  const bebida = decimalOrNull(formData.get("bebida"));
  if ([efectivo, tarjeta, credito, comida, bebida].some(Number.isNaN)) {
    return { error: "Los montos deben ser números." };
  }

  const statusCredito = String(formData.get("statusCredito") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  try {
    const user = await requireEditor(venueId);

    // Si el día ya tiene un corte de caja, éste manda: los montos no se
    // vuelven a capturar a mano, sólo las notas de crédito.
    const existing = await prisma.dailySale.findUnique({ where: { venueId_date: { venueId, date } } });
    if (existing?.source === "CORTE") {
      const saved = await prisma.dailySale.update({ where: { id: existing.id }, data: { statusCredito } });
      await logAudit({
        userId: user.id,
        action: "dailySale.updateStatusCredito",
        entity: "DailySale",
        entityId: saved.id,
        meta: { venueId, date: dateStr },
      });
      revalidate();
      return { ok: true };
    }

    const saved = await prisma.dailySale.upsert({
      where: { venueId_date: { venueId, date } },
      create: { venueId, date, source: "MANUAL", efectivo, tarjeta, credito, statusCredito, comida, bebida, notes, createdById: user.id },
      update: { source: "MANUAL", efectivo, tarjeta, credito, statusCredito, comida, bebida, notes },
    });

    await logAudit({
      userId: user.id,
      action: "dailySale.save",
      entity: "DailySale",
      entityId: saved.id,
      meta: { venueId, date: dateStr, efectivo, tarjeta, credito, comida, bebida },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar la venta diaria:", err);
    return { error: "No se pudo guardar la venta del día." };
  }
}

export async function deleteDailySaleAction(id: string): Promise<DailySaleActionState> {
  try {
    const sale = await prisma.dailySale.findUnique({ where: { id } });
    if (!sale) return { error: "Registro no encontrado." };
    const user = await requireEditor(sale.venueId);

    if (sale.source === "CORTE") {
      return { error: "Esta venta viene de un corte de caja: bórralo desde Cortes de caja en vez de aquí." };
    }

    await prisma.dailySale.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "dailySale.delete",
      entity: "DailySale",
      entityId: id,
      meta: { venueId: sale.venueId, date: sale.date.toISOString().slice(0, 10) },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al borrar la venta diaria:", err);
    return { error: "No se pudo borrar el registro." };
  }
}
