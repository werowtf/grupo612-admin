"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { destroySession, getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { VENUE_COOKIE } from "@/lib/venue";

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
