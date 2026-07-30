"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EntryType, PaymentMethod } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface EntryFormState {
  error?: string;
}

const TYPES: EntryType[] = ["INGRESO", "EGRESO"];
const METHODS: PaymentMethod[] = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "OTRO"];

function textOrNull(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}
function safeInternalPath(value: FormDataEntryValue | null): string {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/ingresos-egresos";
}

async function readPhoto(
  fd: FormData,
): Promise<{ bytes: Uint8Array<ArrayBuffer>; mime: string } | null> {
  const file = fd.get("photo");
  if (!(file instanceof File) || file.size === 0) return null;
  const src = new Uint8Array(await file.arrayBuffer());
  const ab = new ArrayBuffer(src.byteLength);
  const bytes = new Uint8Array(ab);
  bytes.set(src);
  return { bytes, mime: file.type || "image/jpeg" };
}

/** Crea (o edita) un movimiento de ingreso/egreso. */
export async function saveEntryAction(
  _prev: EntryFormState,
  formData: FormData,
): Promise<EntryFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  const entryId = textOrNull(formData, "entryId");
  const venueId = String(formData.get("venueId") ?? "");
  if (!venueId) return { error: "Selecciona la sucursal." };
  try {
    await assertVenueAccess(user, venueId);
  } catch {
    return { error: "No tienes acceso a esta sucursal." };
  }

  // Tipo: la persona de Compras sólo registra egresos.
  let type = String(formData.get("type") ?? "EGRESO") as EntryType;
  if (!TYPES.includes(type)) type = "EGRESO";
  if (user.role === "COMPRAS") type = "EGRESO";

  const dateStr = String(formData.get("date") ?? "").trim();
  if (!dateStr) return { error: "La fecha es obligatoria." };
  const date = new Date(dateStr + "T12:00:00");
  if (isNaN(date.getTime())) return { error: "Fecha inválida." };

  const amount = Number(String(formData.get("amount") ?? "").replace(/[$,\s]/g, ""));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido mayor a cero." };
  }

  const category = String(formData.get("category") ?? "").trim();
  if (!category) return { error: "Selecciona una categoría." };

  let paymentMethod = String(formData.get("paymentMethod") ?? "EFECTIVO") as PaymentMethod;
  if (!METHODS.includes(paymentMethod)) paymentMethod = "EFECTIVO";

  const source = String(formData.get("source") ?? "MANUAL") === "OCR" ? "OCR" : "MANUAL";
  const rawText = textOrNull(formData, "rawText");
  const photo = await readPhoto(formData);

  const data: Prisma.FinancialEntryUncheckedCreateInput = {
    venueId,
    type,
    date,
    amount,
    category,
    description: textOrNull(formData, "description"),
    supplier: textOrNull(formData, "supplier"),
    rfc: textOrNull(formData, "rfc"),
    paymentMethod,
    reference: textOrNull(formData, "reference"),
    folio: textOrNull(formData, "folio"),
    notes: textOrNull(formData, "notes"),
    source,
    rawText,
    createdById: user.id,
    ...(photo ? { photo: photo.bytes, photoMime: photo.mime } : {}),
  };

  let savedId: string;
  try {
    if (entryId) {
      const existing = await prisma.financialEntry.findUnique({ where: { id: entryId } });
      if (!existing || existing.venueId !== venueId) return { error: "Movimiento no encontrado." };
      // Al editar sin nueva foto, conservamos la existente.
      const { photo: _p, photoMime: _m, ...rest } = data;
      const updated = await prisma.financialEntry.update({
        where: { id: entryId },
        data: photo ? data : rest,
      });
      savedId = updated.id;
      await logAudit({ userId: user.id, action: "entry.update", entity: "FinancialEntry", entityId: savedId });
    } else {
      const created = await prisma.financialEntry.create({ data });
      savedId = created.id;
      await logAudit({
        userId: user.id,
        action: "entry.create",
        entity: "FinancialEntry",
        entityId: savedId,
        meta: { type, amount, category },
      });
    }
  } catch (err) {
    console.error("Error al guardar movimiento:", err);
    return { error: "No se pudo guardar el movimiento." };
  }

  revalidatePath("/ingresos-egresos");
  revalidatePath("/compras");
  revalidatePath("/dashboard");
  redirect(safeInternalPath(formData.get("redirectTo")));
}

export async function deleteEntryAction(entryId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const entry = await prisma.financialEntry.findUnique({ where: { id: entryId } });
  if (!entry) return;
  await assertVenueAccess(user, entry.venueId);
  await prisma.financialEntry.delete({ where: { id: entryId } });
  await logAudit({ userId: user.id, action: "entry.delete", entity: "FinancialEntry", entityId: entryId });
  revalidatePath("/ingresos-egresos");
  revalidatePath("/compras");
}

// El procesamiento OCR de tickets ahora corre vía /api/entries/ocr (streaming
// con progreso real); ver src/app/api/entries/ocr/route.ts.
