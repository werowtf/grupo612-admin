import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, verifySession, sessionCookie } from "@/lib/session";

/**
 * Reemite la cookie de sesión con el rol/nombre actuales de la base de datos.
 * El JWT guarda el rol al iniciar sesión; si un administrador lo cambia, el
 * proxy (que sólo ve el JWT) y las páginas (que leen la BD) se contradicen y
 * el navegador entra en un bucle de redirecciones. Está bajo /api, por lo que
 * el proxy no la intercepta.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const goTo = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${sessionCookie.name}=`))
    ?.slice(sessionCookie.name.length + 1);
  const session = token ? await verifySession(decodeURIComponent(token)) : null;

  const clear = (res: NextResponse) => {
    res.cookies.delete(sessionCookie.name);
    return res;
  };

  if (!session) return clear(goTo("/login"));

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return clear(goTo("/login"));

  const fresh = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const home =
    user.role === "COMPRAS" ? "/compras" : user.role === "CONTADOR_EXTERNO" ? "/portal" : "/dashboard";
  const res = goTo(home);
  res.cookies.set(sessionCookie.name, fresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookie.maxAge,
  });
  return res;
}
