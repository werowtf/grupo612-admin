"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { EntryType, UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface CategoryActionState {
  error?: string;
  ok?: boolean;
}

/** Quién puede tocar el catálogo de conceptos del negocio. */
const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

async function requireEditor(venueId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!PUEDEN_EDITAR.includes(user.role)) throw new Error("No autorizado");
  await assertVenueAccess(user, venueId);
  return user;
}

function cleanName(raw: FormDataEntryValue | null): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim();
}

function revalidate() {
  revalidatePath("/ingresos-egresos/conceptos");
  revalidatePath("/ingresos-egresos");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const venueId = String(formData.get("venueId") ?? "");
  const type = String(formData.get("type") ?? "") as EntryType;
  const name = cleanName(formData.get("name"));

  if (type !== "INGRESO" && type !== "EGRESO") return { error: "Tipo inválido." };
  if (!name) return { error: "Escribe el nombre del concepto." };
  if (name.length > 60) return { error: "El nombre es demasiado largo (máximo 60)." };

  try {
    const user = await requireEditor(venueId);

    const existing = await prisma.entryCategory.findUnique({
      where: { venueId_type_name: { venueId, type, name } },
    });
    if (existing) {
      // Si estaba desactivado, se reactiva en vez de rechazar: es lo que la
      // persona quiere cuando vuelve a dar de alta un concepto que ya usó.
      if (existing.active) return { error: `"${name}" ya existe en este negocio.` };
      await prisma.entryCategory.update({ where: { id: existing.id }, data: { active: true } });
      revalidate();
      return { ok: true };
    }

    const last = await prisma.entryCategory.findFirst({
      where: { venueId, type },
      orderBy: { sortOrder: "desc" },
    });
    await prisma.entryCategory.create({
      data: { venueId, type, name, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    await logAudit({
      userId: user.id,
      action: "entryCategory.create",
      entity: "EntryCategory",
      meta: { venueId, type, name },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al crear concepto:", err);
    return { error: "No se pudo crear el concepto." };
  }
}

/**
 * Renombra un concepto y arrastra los movimientos ya registrados.
 *
 * `FinancialEntry.category` guarda el nombre como texto, no una referencia, así
 * que sin actualizar los movimientos el histórico quedaría con el nombre viejo
 * y el concepto renombrado aparecería vacío en los reportes.
 */
export async function renameCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = String(formData.get("id") ?? "");
  const name = cleanName(formData.get("name"));
  if (!name) return { error: "Escribe el nombre del concepto." };
  if (name.length > 60) return { error: "El nombre es demasiado largo (máximo 60)." };

  try {
    const cat = await prisma.entryCategory.findUnique({ where: { id } });
    if (!cat) return { error: "Concepto no encontrado." };
    if (cat.name === name) return { ok: true };

    const user = await requireEditor(cat.venueId);

    const clash = await prisma.entryCategory.findUnique({
      where: { venueId_type_name: { venueId: cat.venueId, type: cat.type, name } },
    });
    if (clash) return { error: `"${name}" ya existe en este negocio.` };

    const { count } = await prisma.$transaction(async (tx) => {
      await tx.entryCategory.update({ where: { id }, data: { name } });
      return tx.financialEntry.updateMany({
        where: { venueId: cat.venueId, type: cat.type, category: cat.name },
        data: { category: name },
      });
    });

    await logAudit({
      userId: user.id,
      action: "entryCategory.rename",
      entity: "EntryCategory",
      entityId: id,
      meta: { venueId: cat.venueId, from: cat.name, to: name, movimientos: count },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al renombrar concepto:", err);
    return { error: "No se pudo renombrar el concepto." };
  }
}

/** Activa o desactiva un concepto. Desactivar no toca los movimientos ya hechos. */
export async function toggleCategoryAction(id: string): Promise<CategoryActionState> {
  try {
    const cat = await prisma.entryCategory.findUnique({ where: { id } });
    if (!cat) return { error: "Concepto no encontrado." };
    const user = await requireEditor(cat.venueId);

    await prisma.entryCategory.update({ where: { id }, data: { active: !cat.active } });
    await logAudit({
      userId: user.id,
      action: "entryCategory.toggleActive",
      entity: "EntryCategory",
      entityId: id,
      meta: { venueId: cat.venueId, name: cat.name, active: !cat.active },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al cambiar el estado del concepto:", err);
    return { error: "No se pudo cambiar el estado del concepto." };
  }
}

/**
 * Borra un concepto, sólo si ningún movimiento lo usa. Con movimientos
 * asociados se desactiva en su lugar, para no dejar el histórico huérfano.
 */
export async function deleteCategoryAction(id: string): Promise<CategoryActionState> {
  try {
    const cat = await prisma.entryCategory.findUnique({ where: { id } });
    if (!cat) return { error: "Concepto no encontrado." };
    const user = await requireEditor(cat.venueId);

    const enUso = await prisma.financialEntry.count({
      where: { venueId: cat.venueId, type: cat.type, category: cat.name },
    });
    if (enUso > 0) {
      return {
        error: `"${cat.name}" tiene ${enUso} movimiento${enUso === 1 ? "" : "s"} registrado${enUso === 1 ? "" : "s"}. Desactívalo en vez de borrarlo para conservar el histórico.`,
      };
    }

    await prisma.entryCategory.delete({ where: { id } });
    await logAudit({
      userId: user.id,
      action: "entryCategory.delete",
      entity: "EntryCategory",
      entityId: id,
      meta: { venueId: cat.venueId, name: cat.name },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al borrar concepto:", err);
    return { error: "No se pudo borrar el concepto." };
  }
}
