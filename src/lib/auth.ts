import "server-only";
import { cookies } from "next/headers";
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
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

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
