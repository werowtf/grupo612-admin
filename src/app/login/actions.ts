"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

function safeNext(next: FormDataEntryValue | null): string {
  const value = typeof next === "string" ? next : "";
  // Sólo rutas internas relativas para evitar open-redirect.
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

const schema = z.object({
  email: z.string().email("Correo inválido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  const genericError = "Correo o contraseña incorrectos";
  if (!user || !user.active) return { error: genericError };

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: genericError };

  await createSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  await logAudit({ userId: user.id, action: "auth.login" });

  // Roles restringidos entran directo a su área.
  if (user.role === "CONTADOR_EXTERNO") redirect("/portal");
  if (user.role === "COMPRAS") redirect("/compras");
  redirect(safeNext(formData.get("next")));
}
