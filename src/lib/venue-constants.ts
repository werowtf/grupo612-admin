// Sin "server-only": lo importa tanto código de servidor (venue.ts, context.ts)
// como el middleware (proxy.ts), que corre en Edge runtime.

export const VENUE_COOKIE = "g612_venue";

/**
 * Valor especial de VENUE_COOKIE para el modo "Oficina": dashboard
 * consolidado de los 4 negocios, no un negocio real. Nunca coincide con un
 * Venue.id real (los cuid() de Prisma no usan este formato).
 */
export const OFICINA_SENTINEL = "__oficina__";
