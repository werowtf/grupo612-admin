import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/session";
import { sessionCookie } from "@/lib/session";

const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(sessionCookie.name)?.value;
  const session = token ? await verifySession(token) : null;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // Roles restringidos a un área fuera del panel principal (además, nadie
  // más puede entrar a esa área: es exclusiva del rol).
  const RESTRICTED: Record<string, string> = {
    CONTADOR_EXTERNO: "/portal",
    COMPRAS: "/compras",
  };
  // Roles confinados a una sola sección DENTRO del panel principal, sin
  // volverla exclusiva: los demás roles siguen entrando normalmente.
  const CONFINED: Record<string, string> = {
    CAJERO: "/cortes",
  };
  const restrictedAreas = Object.values(RESTRICTED);
  const inArea = (base: string) => pathname === base || pathname.startsWith(base + "/");

  // No autenticado en ruta protegida → login.
  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session) {
    const home = RESTRICTED[session.role] ?? CONFINED[session.role]; // área del rol, o undefined
    const redirectTo = (path: string) => {
      const url = request.nextUrl.clone();
      url.pathname = path;
      url.search = "";
      return NextResponse.redirect(url);
    };

    if (home) {
      // Rol restringido: sólo su área (o rutas públicas).
      if (!inArea(home) && !isPublic) return redirectTo(home);
    } else if (restrictedAreas.some((a) => inArea(a))) {
      // Usuario interno intentando entrar a un área restringida.
      return redirectTo("/dashboard");
    }

    // Autenticado en /login → su inicio según rol.
    if (isPublic) return redirectTo(home ?? "/dashboard");
  }

  return NextResponse.next();
}

export const config = {
  // Aplica a todo excepto assets estáticos y rutas internas de Next.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|css|js)$).*)"],
};
