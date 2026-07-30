"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { UserRole } from "@/generated/prisma/enums";

const ROLES: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR", "CONTADOR_EXTERNO", "COMPRAS", "CAJERO"];

export interface UserFormState {
  error?: string;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") throw new Error("No autorizado");
  return user;
}

function getVenueIds(formData: FormData): string[] {
  return formData.getAll("venueIds").map(String).filter(Boolean);
}

const emailSchema = z.string().email("Correo inválido");

/** Crea un usuario nuevo. */
export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const emailRaw = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "");
  const role = ROLES.includes(roleRaw as UserRole) ? (roleRaw as UserRole) : "CAJERO";
  const venueIds = getVenueIds(formData);

  if (!name) return { error: "El nombre es obligatorio." };
  const emailParsed = emailSchema.safeParse(emailRaw);
  if (!emailParsed.success) return { error: emailParsed.error.issues[0]?.message ?? "Correo inválido" };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (role !== "ADMIN" && venueIds.length === 0) {
    return { error: "Selecciona al menos una sucursal para este rol." };
  }

  const existing = await prisma.user.findUnique({ where: { email: emailRaw } });
  if (existing) return { error: "Ya existe un usuario con ese correo." };

  const passwordHash = await hashPassword(password);
  const created = await prisma.user.create({
    data: {
      name,
      email: emailRaw,
      passwordHash,
      role,
      venues: { create: venueIds.map((venueId) => ({ venueId })) },
    },
  });

  await logAudit({
    userId: admin.id,
    action: "user.create",
    entity: "User",
    entityId: created.id,
    meta: { email: created.email, role },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

/** Edita nombre, rol, sucursales y estado activo de un usuario. */
export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuario no encontrado." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const roleRaw = String(formData.get("role") ?? "");
  const role = ROLES.includes(roleRaw as UserRole) ? (roleRaw as UserRole) : target.role;
  const venueIds = getVenueIds(formData);
  const active = formData.get("active") === "on";

  if (role !== "ADMIN" && venueIds.length === 0) {
    return { error: "Selecciona al menos una sucursal para este rol." };
  }

  // No permitir que el único admin activo se quite el rol o se desactive.
  const isSelf = target.id === admin.id;
  const losesAdmin = target.role === "ADMIN" && (role !== "ADMIN" || !active);
  if (isSelf && losesAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (otherAdmins === 0) {
      return { error: "No puedes quitarte el rol de administrador: eres el único activo." };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name, role, active },
    }),
    prisma.userVenue.deleteMany({ where: { userId } }),
    ...(venueIds.length > 0
      ? [
          prisma.userVenue.createMany({
            data: venueIds.map((venueId) => ({ userId, venueId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  await logAudit({
    userId: admin.id,
    action: "user.update",
    entity: "User",
    entityId: userId,
    meta: { role, active },
  });

  revalidatePath("/usuarios");
  redirect("/usuarios");
}

/** Restablece la contraseña de un usuario. */
export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Usuario no encontrado." };

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await logAudit({ userId: admin.id, action: "user.resetPassword", entity: "User", entityId: userId });

  revalidatePath("/usuarios");
  redirect(`/usuarios/${userId}/editar?reset=1`);
}

/** Activa/desactiva un usuario desde la lista. */
export async function toggleActiveAction(userId: string) {
  const admin = await requireAdmin();
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  if (target.id === admin.id && target.active) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (target.role === "ADMIN" && otherAdmins === 0) return; // bloqueado silenciosamente
  }

  await prisma.user.update({ where: { id: userId }, data: { active: !target.active } });
  await logAudit({
    userId: admin.id,
    action: "user.toggleActive",
    entity: "User",
    entityId: userId,
    meta: { active: !target.active },
  });
  revalidatePath("/usuarios");
}
