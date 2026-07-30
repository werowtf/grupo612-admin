import "server-only";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getAccessibleVenues,
  type CurrentUser,
} from "@/lib/auth";
import { getSelectedVenue } from "@/lib/venue";
import { prisma } from "@/lib/prisma";
import type { Venue } from "@/generated/prisma/client";

export interface AppContext {
  user: CurrentUser;
  venues: Venue[];
  selected: Venue | null;
}

/** Contexto de la app para server components: usuario, sucursales y selección. */
export async function getAppContext(): Promise<AppContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const venues = await getAccessibleVenues(user);
  const selected = await getSelectedVenue(venues);
  return { user, venues, selected };
}

/** Verifica que el usuario tenga acceso a la sucursal indicada. */
export async function assertVenueAccess(
  user: CurrentUser,
  venueId: string,
): Promise<void> {
  if (user.role === "ADMIN") return;
  const has = user.venues.some((uv) => uv.venueId === venueId);
  if (!has) throw new Error("Sin acceso a esta sucursal");
}

/** Cuentas bancarias de una sucursal. */
export async function getVenueBankAccounts(venueId: string) {
  return prisma.bankAccount.findMany({
    where: { venueId },
    orderBy: { alias: "asc" },
  });
}
