import "server-only";
import { redirect } from "next/navigation";
import {
  getCurrentUser,
  getAccessibleVenues,
  type CurrentUser,
} from "@/lib/auth";
import { getSelectedVenue, isOficinaSelected } from "@/lib/venue";
import { prisma } from "@/lib/prisma";
import type { Venue } from "@/generated/prisma/client";

export interface AppContext {
  user: CurrentUser;
  venues: Venue[];
  selected: Venue | null;
  /** true si el usuario está viendo el dashboard consolidado "Oficina". */
  oficina: boolean;
}

/** Contexto de la app para server components: usuario, negocios y selección. */
export async function getAppContext(): Promise<AppContext> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const venues = await getAccessibleVenues(user);
  const oficina = user.canAccessOficina && (await isOficinaSelected());
  const selected = oficina ? null : await getSelectedVenue(venues);
  return { user, venues, selected, oficina };
}

/** Verifica que el usuario tenga acceso al negocio indicado. */
export async function assertVenueAccess(
  user: CurrentUser,
  venueId: string,
): Promise<void> {
  if (user.role === "ADMIN") return;
  const has = user.venues.some((uv) => uv.venueId === venueId);
  if (!has) throw new Error("Sin acceso a este negocio");
}

/** Cuentas bancarias de un negocio. */
export async function getVenueBankAccounts(venueId: string) {
  return prisma.bankAccount.findMany({
    where: { venueId },
    orderBy: { alias: "asc" },
  });
}
