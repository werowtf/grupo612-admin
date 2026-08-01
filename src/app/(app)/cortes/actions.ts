"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { parseCorteFile, CorteImportError, type CorteExtraction } from "@/lib/cortes";
import { MONEY_KEYS, INT_KEYS } from "@/lib/cortes/fields";
import { getCorteMatching } from "@/lib/cortes/matching";
import type { CorteSource } from "@/generated/prisma/enums";

export type ProcessResult =
  | { ok: true; extraction: CorteExtraction }
  | { ok: false; error: string };

/** Procesa el archivo subido (Excel u foto) y devuelve el borrador extraído. */
export async function processCorteFileAction(formData: FormData): Promise<ProcessResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sesión expirada." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecciona un archivo." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const extraction = await parseCorteFile(file.name, buffer);
    return { ok: true, extraction };
  } catch (err) {
    if (err instanceof CorteImportError) return { ok: false, error: err.message };
    console.error("Error al procesar corte:", err);
    return {
      ok: false,
      error: "No se pudo procesar el archivo. Puedes capturar los datos manualmente.",
    };
  }
}

function money(fd: FormData, key: string): number {
  const raw = String(fd.get(key) ?? "").replace(/[$,\s]/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
function intOrNull(fd: FormData, key: string): number | null {
  const raw = String(fd.get(key) ?? "").replace(/[,\s]/g, "");
  if (raw === "") return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function textOrNull(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** Guarda (crea o actualiza) un corte de caja. */
export async function saveCorteAction(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  const venueId = String(formData.get("venueId") ?? "");
  const corteId = textOrNull(formData, "corteId");
  if (!venueId) return { error: "Falta el negocio." };

  try {
    await assertVenueAccess(user, venueId);
  } catch {
    return { error: "No tienes acceso a este negocio." };
  }

  const dateStr = String(formData.get("date") ?? "").trim();
  if (!dateStr) return { error: "La fecha del corte es obligatoria." };
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha inválida." };

  const sourceRaw = String(formData.get("source") ?? "MANUAL");
  const source: CorteSource = ["MANUAL", "EXCEL", "OCR"].includes(sourceRaw)
    ? (sourceRaw as CorteSource)
    : "MANUAL";

  const data: Prisma.CorteUncheckedCreateInput = {
    venueId,
    date,
    turno: textOrNull(formData, "turno"),
    cajera: textOrNull(formData, "cajera"),
    estacion: textOrNull(formData, "estacion"),
    folioCorteZ: textOrNull(formData, "folioCorteZ"),
    folioInicial: textOrNull(formData, "folioInicial"),
    folioFinal: textOrNull(formData, "folioFinal"),
    notes: textOrNull(formData, "notes"),
    source,
    fileName: textOrNull(formData, "fileName"),
    createdById: user.id,
  };

  for (const key of MONEY_KEYS) {
    // @ts-expect-error asignación dinámica de campos Decimal
    data[key] = money(formData, key);
  }
  for (const key of INT_KEYS) {
    // @ts-expect-error asignación dinámica de campos Int
    data[key] = intOrNull(formData, key);
  }

  let savedId: string;
  try {
    if (corteId) {
      const existing = await prisma.corte.findUnique({ where: { id: corteId } });
      if (!existing || existing.venueId !== venueId) {
        return { error: "Corte no encontrado." };
      }
      const updated = await prisma.corte.update({ where: { id: corteId }, data });
      savedId = updated.id;
      await logAudit({
        userId: user.id,
        action: "corte.update",
        entity: "Corte",
        entityId: savedId,
      });
    } else {
      const created = await prisma.corte.create({ data });
      savedId = created.id;
      await logAudit({
        userId: user.id,
        action: "corte.create",
        entity: "Corte",
        entityId: savedId,
        meta: { source, folio: data.folioCorteZ },
      });
    }
  } catch (err) {
    // Violación de folio único
    if (typeof err === "object" && err && "code" in err && (err as { code: string }).code === "P2002") {
      return { error: "Ya existe un corte con ese folio en este negocio." };
    }
    console.error("Error al guardar corte:", err);
    return { error: "No se pudo guardar el corte." };
  }

  revalidatePath("/cortes");
  revalidatePath("/dashboard");
  redirect(`/cortes/${savedId}`);
}

// ── Conciliación corte ↔ depósitos bancarios ─────────────────

/** Vincula un depósito bancario a un corte (marca el movimiento como conciliado). */
export async function linkDepositAction(corteId: string, txId: string) {
  const user = await getCurrentUser();
  if (!user) return;

  const [corte, tx] = await Promise.all([
    prisma.corte.findUnique({ where: { id: corteId } }),
    prisma.bankTransaction.findUnique({
      where: { id: txId },
      include: { bankAccount: true },
    }),
  ]);
  if (!corte || !tx) return;
  if (tx.bankAccount.venueId !== corte.venueId) return; // mismo negocio
  await assertVenueAccess(user, corte.venueId);

  await prisma.bankTransaction.update({
    where: { id: txId },
    data: { corteId, status: "CONCILIADO" },
  });
  await logAudit({
    userId: user.id,
    action: "corte.linkDeposit",
    entity: "Corte",
    entityId: corteId,
    meta: { txId },
  });
  revalidatePath(`/cortes/${corteId}`);
  revalidatePath("/movimientos");
}

/** Quita el vínculo de un depósito (vuelve a pendiente). */
export async function unlinkDepositAction(txId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const tx = await prisma.bankTransaction.findUnique({
    where: { id: txId },
    include: { bankAccount: true },
  });
  if (!tx) return;
  await assertVenueAccess(user, tx.bankAccount.venueId);

  const corteId = tx.corteId;
  await prisma.bankTransaction.update({
    where: { id: txId },
    data: { corteId: null, status: "PENDIENTE" },
  });
  await logAudit({
    userId: user.id,
    action: "corte.unlinkDeposit",
    entity: "BankTransaction",
    entityId: txId,
  });
  if (corteId) revalidatePath(`/cortes/${corteId}`);
  revalidatePath("/movimientos");
}

/** Auto-concilia: vincula la mejor sugerencia si su monto está dentro de tolerancia. */
export async function autoMatchCorteAction(
  corteId: string,
): Promise<{ linked: number; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { linked: 0, message: "Sesión expirada." };
  const corte = await prisma.corte.findUnique({ where: { id: corteId } });
  if (!corte) return { linked: 0, message: "Corte no encontrado." };
  await assertVenueAccess(user, corte.venueId);

  const { cardTotal, linkedTotal, suggestions } = await getCorteMatching(corte);
  if (cardTotal <= 0) {
    return { linked: 0, message: "El corte no tiene ventas con tarjeta para conciliar." };
  }
  const remaining = cardTotal - linkedTotal;
  const best = suggestions[0];
  if (!best) return { linked: 0, message: "No hay depósitos candidatos en el rango de fechas." };

  const tolerance = Math.max(remaining * 0.2, 50); // 20% o $50
  if (Math.abs(best.amount - remaining) > tolerance) {
    return {
      linked: 0,
      message:
        "Ninguna sugerencia coincide con suficiente certeza. Vincula manualmente el depósito correcto.",
    };
  }

  await prisma.bankTransaction.update({
    where: { id: best.id },
    data: { corteId, status: "CONCILIADO" },
  });
  await logAudit({
    userId: user.id,
    action: "corte.autoMatch",
    entity: "Corte",
    entityId: corteId,
    meta: { txId: best.id, amount: best.amount },
  });
  revalidatePath(`/cortes/${corteId}`);
  revalidatePath("/movimientos");
  return { linked: 1, message: "Se vinculó el depósito más probable. Verifica el resultado." };
}

export async function deleteCorteAction(corteId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const corte = await prisma.corte.findUnique({ where: { id: corteId } });
  if (!corte) return;
  await assertVenueAccess(user, corte.venueId);
  await prisma.corte.delete({ where: { id: corteId } });
  await logAudit({
    userId: user.id,
    action: "corte.delete",
    entity: "Corte",
    entityId: corteId,
  });
  revalidatePath("/cortes");
  redirect("/cortes");
}
