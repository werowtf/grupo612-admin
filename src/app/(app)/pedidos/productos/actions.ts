"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";

export interface ProductoActionState {
  error?: string;
  ok?: boolean;
}

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
  revalidatePath("/pedidos/productos");
  revalidatePath("/pedidos");
}

export async function createProductoAction(
  _prev: ProductoActionState,
  formData: FormData,
): Promise<ProductoActionState> {
  const cafeteriaId = String(formData.get("cafeteriaId") ?? "");
  const name = cleanName(formData.get("name"));
  const price = Number(formData.get("price"));

  if (!name) return { error: "Escribe el nombre del producto." };
  if (name.length > 80) return { error: "El nombre es demasiado largo (máximo 80)." };
  if (!Number.isFinite(price) || price <= 0) return { error: "El precio debe ser mayor a cero." };

  try {
    const cafeteria = await prisma.cafeteria.findUnique({ where: { id: cafeteriaId } });
    if (!cafeteria) return { error: "Café no encontrado." };
    const user = await requireEditor(cafeteria.venueId);

    const existing = await prisma.productoCafeteria.findUnique({
      where: { cafeteriaId_name: { cafeteriaId, name } },
    });
    if (existing) {
      if (existing.active) return { error: `"${name}" ya existe en este café.` };
      await prisma.productoCafeteria.update({ where: { id: existing.id }, data: { active: true, price } });
      revalidate();
      return { ok: true };
    }

    const last = await prisma.productoCafeteria.findFirst({ where: { cafeteriaId }, orderBy: { sortOrder: "desc" } });
    await prisma.productoCafeteria.create({
      data: { cafeteriaId, name, price, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
    await logAudit({
      userId: user.id,
      action: "productoCafeteria.create",
      entity: "ProductoCafeteria",
      meta: { cafeteriaId, name, price },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al crear producto:", err);
    return { error: "No se pudo crear el producto." };
  }
}

export async function updateProductoAction(
  _prev: ProductoActionState,
  formData: FormData,
): Promise<ProductoActionState> {
  const id = String(formData.get("id") ?? "");
  const name = cleanName(formData.get("name"));
  const price = Number(formData.get("price"));

  if (!name) return { error: "Escribe el nombre del producto." };
  if (name.length > 80) return { error: "El nombre es demasiado largo (máximo 80)." };
  if (!Number.isFinite(price) || price <= 0) return { error: "El precio debe ser mayor a cero." };

  try {
    const producto = await prisma.productoCafeteria.findUnique({ where: { id } });
    if (!producto) return { error: "Producto no encontrado." };
    const cafeteria = await prisma.cafeteria.findUnique({ where: { id: producto.cafeteriaId } });
    if (!cafeteria) return { error: "Café no encontrado." };
    const user = await requireEditor(cafeteria.venueId);

    if (name !== producto.name) {
      const clash = await prisma.productoCafeteria.findUnique({
        where: { cafeteriaId_name: { cafeteriaId: producto.cafeteriaId, name } },
      });
      if (clash) return { error: `"${name}" ya existe en este café.` };
    }

    await prisma.productoCafeteria.update({ where: { id }, data: { name, price } });
    await logAudit({
      userId: user.id,
      action: "productoCafeteria.update",
      entity: "ProductoCafeteria",
      entityId: id,
      meta: { name, price },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al actualizar producto:", err);
    return { error: "No se pudo actualizar el producto." };
  }
}

export async function toggleProductoAction(id: string): Promise<ProductoActionState> {
  try {
    const producto = await prisma.productoCafeteria.findUnique({ where: { id } });
    if (!producto) return { error: "Producto no encontrado." };
    const cafeteria = await prisma.cafeteria.findUnique({ where: { id: producto.cafeteriaId } });
    if (!cafeteria) return { error: "Café no encontrado." };
    const user = await requireEditor(cafeteria.venueId);

    await prisma.productoCafeteria.update({ where: { id }, data: { active: !producto.active } });
    await logAudit({
      userId: user.id,
      action: "productoCafeteria.toggleActive",
      entity: "ProductoCafeteria",
      entityId: id,
      meta: { active: !producto.active },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al cambiar el estado del producto:", err);
    return { error: "No se pudo cambiar el estado del producto." };
  }
}
