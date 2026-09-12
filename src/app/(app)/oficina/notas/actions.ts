"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export interface NotaActionState {
  error?: string;
  ok?: boolean;
}

async function requireOficina() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!user.canAccessOficina) throw new Error("No autorizado");
  return user;
}

function revalidate() {
  revalidatePath("/oficina/notas");
}

/** Crea o edita una nota del bloc compartido de Oficina. */
export async function saveNotaAction(
  _prev: NotaActionState,
  formData: FormData,
): Promise<NotaActionState> {
  const id = String(formData.get("id") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Escribe algo en la nota." };

  try {
    const user = await requireOficina();

    if (id) {
      await prisma.oficinaNota.update({ where: { id }, data: { content } });
      await logAudit({ userId: user.id, action: "oficinaNota.editar", entity: "OficinaNota", entityId: id });
    } else {
      const created = await prisma.oficinaNota.create({ data: { content, createdById: user.id } });
      await logAudit({
        userId: user.id,
        action: "oficinaNota.crear",
        entity: "OficinaNota",
        entityId: created.id,
      });
    }
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar nota de Oficina:", err);
    return { error: "No se pudo guardar." };
  }
}

/** Elimina una nota del bloc compartido de Oficina. */
export async function deleteNotaAction(id: string): Promise<NotaActionState> {
  try {
    const user = await requireOficina();
    await prisma.oficinaNota.delete({ where: { id } }).catch(() => {});
    await logAudit({ userId: user.id, action: "oficinaNota.eliminar", entity: "OficinaNota", entityId: id });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al eliminar nota de Oficina:", err);
    return { error: "No se pudo eliminar." };
  }
}
