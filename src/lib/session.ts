// Módulo de sesión basado en JWT (jose). Compatible con Edge (proxy.ts) y Node.
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/generated/prisma/enums";

const COOKIE_NAME = "g612_session";
const MAX_AGE = 60 * 60 * 8; // 8 horas

export interface SessionPayload {
  sub: string; // userId
  email: string;
  name: string;
  role: UserRole;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Falta AUTH_SECRET");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE,
};
