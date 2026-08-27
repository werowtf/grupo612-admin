import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CorteDraft, CorteExtraction } from "./types";
import { detectVenueFromText } from "./venue-detect";

/**
 * Extrae un corte de caja desde una foto usando un modelo de visión.
 *
 * Sustituye al OCR por plantillas (Tesseract), que solo funcionaba con una
 * foto limpia de un solo ticket: en las fotos reales de caja aparecen varios
 * documentos a la vez (Corte Z, hoja manuscrita, cierre de terminal, vales),
 * en ángulo y con sombras, y el texto de unos se mezclaba con el de otros.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // límite de la API por imagen

const MEDIA_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
} as const;

export type SupportedMediaType = (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES];

export class VisionError extends Error {}

/** Deduce el media type a partir del nombre o del tipo declarado del archivo. */
export function resolveMediaType(fileName: string, declared?: string): SupportedMediaType {
  const normalized = (declared ?? "").toLowerCase();
  if (normalized === "image/jpg") return "image/jpeg";
  if ((Object.values(MEDIA_TYPES) as string[]).includes(normalized)) {
    return normalized as SupportedMediaType;
  }
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const byExt = MEDIA_TYPES[ext as keyof typeof MEDIA_TYPES];
  if (byExt) return byExt;
  throw new VisionError("Formato de imagen no soportado. Usa JPG, PNG o WEBP.");
}

/** ¿Está configurada la credencial para usar el modelo de visión? */
export function visionAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const money = () => z.number().nullable();
const text = () => z.string().nullable();

/**
 * El modelo devuelve todos los campos siempre; `null` significa "no aparece o
 * no se lee con certeza". Pedir null explícito en vez de omitir la clave evita
 * que invente un valor para completar el objeto.
 */
const CorteSchema = z.object({
  encabezado: text(),
  date: text(),
  turno: text(),
  cajera: text(),
  estacion: text(),
  folioCorteZ: text(),
  folioInicial: text(),
  folioFinal: text(),

  pagoEfectivo: money(),
  pagoVisa: money(),
  pagoMastercard: money(),
  pagoAmex: money(),
  pagoVales: money(),
  pagoOtros: money(),
  totalFormasPago: money(),

  propinaEfectivo: money(),
  propinaVisa: money(),
  propinaMastercard: money(),
  propinaAmex: money(),
  totalPropinas: money(),

  ventaAlimentos: money(),
  ventaBebidas: money(),
  ventaOtros: money(),

  subtotal: money(),
  descuentos: money(),
  ventaNeta: money(),
  iva: money(),
  totalVenta: money(),

  efectivoInicial: money(),
  efectivoDeclarado: money(),
  retiros: money(),
  depositos: money(),
  sobranteFaltante: money(),

  cuentasNormales: money(),
  cuentasCanceladas: money(),
  comensales: money(),
  cuentaPromedio: money(),
});

const SYSTEM = `Eres un asistente contable de Grupo 612 (restaurantes en La Paz, BCS). Extraes los datos de un ticket "Corte Z" de Soft Restaurant a partir de una foto.

CONTEXTO DE LA FOTO
La foto se toma en la caja al cierre y suele incluir VARIOS documentos a la vez:
- El ticket "CORTE Z" impreso por Soft Restaurant (el único del que debes extraer datos).
- Una hoja manuscrita "CORTE DE CAJA" con el conteo de monedas y billetes.
- El "INFORME DE CIERRE" de la terminal bancaria (BanBajío/Santander).
- Vales de caja por retiros de efectivo.

Extrae ÚNICAMENTE del ticket CORTE Z. Ignora por completo los otros documentos: sus cifras se parecen pero NO son las mismas.

REGLAS
- Devuelve números planos, sin "$" ni separadores de miles: 42697.25, no "$42,697.25".
- "SOBRANTE(+) O FALTANTE(-)" puede ser negativo; respeta el signo tal como aparece.
- "date" en formato yyyy-mm-dd. El ticket suele traer la fecha como dd/mm/aaaa: 05/08/2026 es el 5 de agosto de 2026, no el 8 de mayo.
- No confundas "VENTA POR TIPO DE PRODUCTO" (alimentos/bebidas) con "CORTESIA ALIMENTOS/BEBIDAS" ni con "DESCUENTO ALIMENTOS/BEBIDAS": son secciones distintas más abajo del ticket.
- "efectivoDeclarado" es el efectivo final declarado en caja; "efectivoInicial" es el fondo con el que abrió.
- "encabezado" es el nombre del negocio impreso arriba del ticket, tal cual (por ejemplo "BIZNAGA BAJA BISTRO ROOF EXPERIENCE").
- Si un dato no aparece en el ticket, o no lo puedes leer con certeza, devuelve null. NUNCA inventes ni estimes un valor: es preferible que el usuario lo capture a mano a que quede un número equivocado en la contabilidad.`;

const USER_PROMPT =
  "Extrae los datos del ticket CORTE Z de esta foto. Recuerda: solo del Corte Z, y null en lo que no se lea con certeza.";

/** Lee un corte de caja desde una foto usando el modelo de visión. */
export async function parseCorteVision(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<CorteExtraction> {
  if (!visionAvailable()) {
    throw new VisionError("Falta configurar ANTHROPIC_API_KEY para leer fotos.");
  }
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    throw new VisionError(
      "La foto pesa más de 5 MB. Vuelve a tomarla con menor resolución o compártela comprimida.",
    );
  }

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: buffer.toString("base64") },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(CorteSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new VisionError("El modelo no pudo procesar esta imagen. Captura los datos a mano.");
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new VisionError("No se pudo leer el ticket. Intenta con otra foto o captura a mano.");
  }

  const { encabezado, ...fields } = parsed;
  const draft: CorteDraft = {};
  const detected: (keyof CorteDraft)[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === "") continue;
    (draft as Record<string, unknown>)[key] = value;
    detected.push(key as keyof CorteDraft);
  }

  return {
    source: "OCR",
    draft,
    rawText: encabezado ?? undefined,
    detected,
    detectedVenueName: encabezado ? detectVenueFromText(encabezado) : undefined,
  };
}
