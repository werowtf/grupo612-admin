import "server-only";
import { cookies } from "next/headers";
import type { Venue } from "@/generated/prisma/client";
import { VENUE_COOKIE, OFICINA_SENTINEL } from "@/lib/venue-constants";

export { VENUE_COOKIE };

/** true si la cookie de negocio está en modo "Oficina" (dashboard consolidado). */
export async function isOficinaSelected(): Promise<boolean> {
  const store = await cookies();
  return store.get(VENUE_COOKIE)?.value === OFICINA_SENTINEL;
}

/**
 * Devuelve el negocio seleccionado (por cookie) validado contra los accesibles.
 * Si no hay cookie válida, usa el primero accesible. Si la cookie está en modo
 * Oficina, devuelve null explícitamente (el llamador debe checar isOficinaSelected
 * antes para no caer aquí por error).
 */
export async function getSelectedVenue(
  accessibleVenues: Venue[],
): Promise<Venue | null> {
  const store = await cookies();
  const id = store.get(VENUE_COOKIE)?.value;
  if (id === OFICINA_SENTINEL) return null;
  if (accessibleVenues.length === 0) return null;
  const found = accessibleVenues.find((v) => v.id === id);
  return found ?? accessibleVenues[0];
}
