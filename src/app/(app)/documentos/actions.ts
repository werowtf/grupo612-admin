"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { DOCUMENT_CATEGORIES } from "@/lib/labels";
import type { DocumentCategory } from "@/generated/prisma/enums";

export interface DocumentFormState {
  error?: string;
}

const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

function textOrNull(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/** Sube un nuevo documento al repositorio. */
export async function uploadDocumentAction(
  _prev: DocumentFormState,
  formData: FormData,
): Promise<DocumentFormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada." };

  const venueId = String(formData.get("venueId") ?? "");
  if (!venueId) return { error: "Selecciona el negocio." };
  try {
    await assertVenueAccess(user, venueId);
  } catch {
    return { error: "No tienes acceso a este negocio." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Ingresa un título para el documento." };

  const categoryRaw = String(formData.get("category") ?? "OTRO");
  const category = DOCUMENT_CATEGORIES.includes(categoryRaw as DocumentCategory)
    ? (categoryRaw as DocumentCategory)
    : "OTRO";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "El archivo supera el límite de 15 MB." };
  }

  const src = new Uint8Array(await file.arrayBuffer());
  const ab = new ArrayBuffer(src.byteLength);
  const bytes = new Uint8Array(ab);
  bytes.set(src);

  const doc = await prisma.document.create({
    data: {
      venueId,
      title,
      category,
      tags: textOrNull(formData, "tags"),
      notes: textOrNull(formData, "notes"),
      fileName: file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      file: bytes,
      corteId: textOrNull(formData, "corteId"),
      entryId: textOrNull(formData, "entryId"),
      bankTransactionId: textOrNull(formData, "bankTransactionId"),
      uploadedById: user.id,
    },
  });

  await logAudit({
    userId: user.id,
    action: "document.upload",
    entity: "Document",
    entityId: doc.id,
    meta: { fileName: file.name, category },
  });

  revalidatePath("/documentos");
  const redirectTo = textOrNull(formData, "redirectTo");
  redirect(redirectTo ?? `/documentos/${doc.id}`);
}

export async function deleteDocumentAction(documentId: string) {
  const user = await getCurrentUser();
  if (!user) return;
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return;
  await assertVenueAccess(user, doc.venueId);
  await prisma.document.delete({ where: { id: documentId } });
  await logAudit({
    userId: user.id,
    action: "document.delete",
    entity: "Document",
    entityId: documentId,
  });
  revalidatePath("/documentos");
  redirect("/documentos");
}
