"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, getSession, getCurrentUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { VENUE_COOKIE, OFICINA_SENTINEL } from "@/lib/venue-constants";

export async function logoutAction() {
  const session = await getSession();
  await logAudit({ userId: session?.sub, action: "auth.logout" });
  await destroySession();
  redirect("/login");
}

export async function selectVenueAction(venueId: string) {
  const store = await cookies();
  store.set(VENUE_COOKIE, venueId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}

/** Activa el modo "Oficina" (dashboard consolidado); ignora silenciosamente sin el permiso. */
export async function selectOficinaAction() {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) return;

  const store = await cookies();
  store.set(VENUE_COOKIE, OFICINA_SENTINEL, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  revalidatePath("/", "layout");
}
