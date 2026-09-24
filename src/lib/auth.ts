import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  signSession,
  verifySession,
  sessionCookie,
  type SessionPayload,
} from "@/lib/session";

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Lee y verifica la sesión desde la cookie. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(sessionCookie.name)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Crea la cookie de sesión para un usuario. */
export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(sessionCookie.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(sessionCookie.name);
}

/** Devuelve el usuario autenticado (con negocios), o null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { venues: { include: { venue: true } } },
  });
  if (!user || !user.active) return null;
  // El rol del JWT quedó desactualizado (alguien lo cambió): se reemite la
  // sesión en vez de dejar que el proxy y las páginas se contradigan.
  if (session.role !== user.role) redirect("/api/session/refresh");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * VISOR es el único rol de sólo lectura: nunca puede escribir, ni siquiera en
 * módulos que no tienen su propio allowlist de roles. Se revisa al inicio de
 * toda server action que mute algo — sin este check, VISOR heredaría el
 * mismo acceso de escritura que cualquier otro rol interno ahí donde no hay
 * un PUEDEN_EDITAR explícito.
 */
export function isReadOnly(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "VISOR";
}

/**
 * Compras y Contador externo viven en su propia área (proxy.ts) y no usan los
 * cortes de caja. Las server actions y el OCR se llaman por HTTP directo, sin
 * pasar por el confinamiento de rutas, así que se bloquean aquí también.
 */
export function noAccesoCortes(user: Pick<CurrentUser, "role">): boolean {
  return user.role === "COMPRAS" || user.role === "CONTADOR_EXTERNO";
}

/** Negocios accesibles: ADMIN ve todos; el resto sólo los asignados. */
export async function getAccessibleVenues(user: CurrentUser) {
  if (user.role === "ADMIN") {
    return prisma.venue.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
  }
  return user.venues.map((uv) => uv.venue).filter((v) => v.active);
}
