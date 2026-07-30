import "server-only";
import { cookies } from "next/headers";
import type { Venue } from "@/generated/prisma/client";

export const VENUE_COOKIE = "g612_venue";

/**
 * Devuelve la sucursal seleccionada (por cookie) validada contra las accesibles.
 * Si no hay cookie válida, usa la primera accesible.
 */
export async function getSelectedVenue(
  accessibleVenues: Venue[],
): Promise<Venue | null> {
  if (accessibleVenues.length === 0) return null;
  const store = await cookies();
  const id = store.get(VENUE_COOKIE)?.value;
  const found = accessibleVenues.find((v) => v.id === id);
  return found ?? accessibleVenues[0];
}
