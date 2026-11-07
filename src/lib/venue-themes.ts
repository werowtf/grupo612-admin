/**
 * Tema de color de cada negocio, sacado del color de su logo (public/logo-*.svg).
 * Sólo cambia el color de acento de la app (botones, enlaces, menú activo, gráficas);
 * los colores con significado (ingreso verde, egreso azul, alertas) no cambian.
 * Un negocio sin entrada aquí (Comisariato, todavía sin logo) y el modo Oficina
 * usan el verde de Grupo 612.
 */
export interface VenueThemeColors {
  /** Acento: botones, enlaces y elementos activos (tokens brand-600 / primary / chart-1). */
  accent: string;
  /** Tinte muy claro del acento (fondos de resaltado, token brand-50). */
  tint: string;
}

export interface VenueTheme {
  /** Color del logo del que sale el tema. */
  logo: string;
  light: VenueThemeColors;
  /** En modo oscuro el acento se aclara para que se lea sobre fondo oscuro. */
  dark: VenueThemeColors;
}

export const VENUE_THEMES: Record<string, VenueTheme> = {
  // Logo rojo terracota.
  biznaga: {
    logo: "#983927",
    light: { accent: "#983927", tint: "#F5EBE9" },
    dark: { accent: "#D1604A", tint: "#F5EBE9" },
  },
  // Logo casi negro (#231f20): acento carbón en claro, gris cálido en oscuro (el negro no se vería).
  unobar: {
    logo: "#231F20",
    light: { accent: "#231F20", tint: "#EEEDED" },
    dark: { accent: "#8E8083", tint: "#EEEDED" },
  },
  // Logo verde azulado.
  "612rooftop": {
    logo: "#02B0A1",
    light: { accent: "#02B0A1", tint: "#E6F7F6" },
    dark: { accent: "#02B0A1", tint: "#E6F7F6" },
  },
};

/** Logos oscuros que en modo oscuro se invierten (a blanco) para que no desaparezcan. */
export const LOGOS_INVERT_ON_DARK = new Set(["unobar"]);

const vars = (c: VenueThemeColors) =>
  `--color-brand-600:${c.accent};--color-brand-50:${c.tint};--primary:${c.accent};--chart-1:${c.accent};`;

/** CSS que sobreescribe el acento de la app para el negocio (null = tema por defecto). */
export function venueThemeCss(slug: string | null | undefined): string | null {
  const theme = slug ? VENUE_THEMES[slug] : undefined;
  if (!theme) return null;
  return `:root{${vars(theme.light)}}.dark{${vars(theme.dark)}}`;
}
