/**
 * Frases del encabezado del ticket Corte Z que identifican a cada negocio.
 * El OCR es ruidoso (mayúsculas mal leídas, acentos perdidos), así que se
 * compara sobre texto normalizado (mayúsculas, sin acentos).
 */
/*
 * El orden importa: gana la primera coincidencia, así que van primero los
 * nombres propios de cada negocio y al final los lemas genéricos.
 *
 * "ROOF EXPERIENCE" NO identifica a un negocio por sí solo: el encabezado de
 * Biznaga es "BIZNAGA BAJA BISTRO / ROOF EXPERIENCE", así que con este lema
 * primero, los cortes de Biznaga se asignaban a UNO Bar.
 */
const VENUE_HEADER_HINTS: { venueName: string; hints: string[] }[] = [
  { venueName: "Biznaga", hints: ["BIZNAGA BAJA BISTRO", "BIZNAGA"] },
  { venueName: "612 Rooftop", hints: ["SEIS UNO DOS", "612 ROOFTOP"] },
  { venueName: "UNO Bar", hints: ["UNO BAR", "ROOF EXPERIENCE"] },
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    // Los encabezados suelen imprimirse centrados en varias líneas (p.ej.
    // "ROOF" y "EXPERIENCE" en renglones separados); sin colapsar los
    // espacios en blanco, una frase de varias palabras nunca calzaría.
    .replace(/\s+/g, " ")
    .trim();
}

/** Infiere el negocio a partir del texto OCR del encabezado del ticket. */
export function detectVenueFromText(rawText: string): string | undefined {
  const normalized = normalize(rawText);
  for (const { venueName, hints } of VENUE_HEADER_HINTS) {
    if (hints.some((hint) => normalized.includes(normalize(hint)))) {
      return venueName;
    }
  }
  return undefined;
}
