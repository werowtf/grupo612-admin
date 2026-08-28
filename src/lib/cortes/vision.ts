import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { CorteDraft, CorteExtraction } from "./types";
import { detectVenueFromText } from "./venue-detect";
import { validarCuadres } from "./validate";

/**
 * Extrae un corte de caja desde una foto o un PDF usando un modelo de visión.
 *
 * Sustituye al OCR por plantillas (Tesseract), que solo funcionaba con una
 * foto limpia de un solo ticket: en las fotos reales de caja aparecen varios
 * documentos a la vez (Corte Z, hoja manuscrita, cierre de terminal, vales),
 * en ángulo y con sombras, y el texto de unos se mezclaba con el de otros.
 */

// Las imágenes topan en 5 MB por archivo; los PDF viajan como documento y el
// límite real es el de la petición completa (32 MB), pero base64 infla ~33%,
// así que dejamos margen.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;

const PDF_MEDIA_TYPE = "application/pdf";

const MEDIA_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  pdf: PDF_MEDIA_TYPE,
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
  throw new VisionError("Formato no soportado. Sube una foto (JPG/PNG) o un PDF.");
}

/** ¿Está configurada la credencial para usar el modelo de visión? */
export function visionAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const money = () => z.number();
const text = () => z.string();

/**
 * Todos los campos son obligatorios y el modelo reporta aparte, en
 * `camposNoLegibles`, cuáles no pudo leer.
 *
 * Es contraintuitivo pero es lo que permiten las salidas estructuradas: como
 * máximo 16 campos con tipo unión (`nullable` cuenta como unión) y 24 campos
 * opcionales. Con ~37 campos, tanto `nullable` como `optional` devuelven un
 * 400. La lista explícita conserva lo importante — que el modelo pueda decir
 * "no lo leí" en vez de inventar un número — y además distingue un $0.00 real
 * (p. ej. "VALES: $0.00") de un campo ilegible.
 */
const CorteSchema = z.object({
  camposNoLegibles: z
    .array(z.string())
    .describe("Nombres de los campos que no aparecen en el ticket o no se leen con certeza"),

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

const SYSTEM = `Eres un asistente contable de Grupo 612 (restaurantes en La Paz, BCS). Extraes los datos de un corte de caja de Soft Restaurant.

DE DÓNDE VIENE EL DOCUMENTO
Te puede llegar de dos formas:
1. Un PDF generado por el sistema: un solo documento, texto limpio. Es el caso fácil.
2. Una foto tomada en la caja al cierre, que suele incluir VARIOS documentos a la vez:
   - El ticket del corte impreso por Soft Restaurant (el único del que debes extraer datos).
   - Una hoja manuscrita "CORTE DE CAJA" con el conteo de monedas y billetes.
   - El "INFORME DE CIERRE" de la terminal bancaria (BanBajío/Santander).
   - Vales de caja por retiros de efectivo.

Si hay varios documentos, extrae ÚNICAMENTE del corte de Soft Restaurant e ignora los demás: sus cifras se parecen pero NO son las mismas.

REGLAS
- Devuelve números planos, sin "$" ni separadores de miles: 42697.25, no "$42,697.25".
- "SOBRANTE(+) O FALTANTE(-)" puede ser negativo; respeta el signo tal como aparece.
- "date" en formato yyyy-mm-dd. El ticket suele traer la fecha como dd/mm/aaaa: 05/08/2026 es el 5 de agosto de 2026, no el 8 de mayo.
- No confundas "VENTA POR TIPO DE PRODUCTO" (alimentos/bebidas) con "CORTESIA ALIMENTOS/BEBIDAS" ni con "DESCUENTO ALIMENTOS/BEBIDAS": son secciones distintas más abajo del ticket.
- La sección "CAJA" (arriba del ticket) lista movimientos de efectivo con signo. Mapea línea por línea, sin saltarte ninguna:
    "+EFECTIVO INIC" -> efectivoInicial
    "+DEPOSITOS EFE" -> depositos
    "-RETIROS EFECT" -> retiros
    "EFECTIVO FINA"  -> efectivoDeclarado
  Ojo: "-RETIROS EFECT" y "-PROPINAS PAGA" son renglones vecinos y muy parecidos. "-PROPINAS PAGA" NO se captura, y suele ser el que trae el importe (las propinas de tarjeta que se pagan en efectivo al cierre), mientras que retiros normalmente va en 0. Lee el importe que está en el renglón de retiros, no el del vecino.
- Comprueba con la aritmética antes de responder: efectivoInicial + efectivo + tarjeta + vales + otros + depositos − retiros − propinas pagadas = "SALDO FINAL". Si con tu lectura no da el SALDO FINAL impreso, tienes mal algún renglón; corrígelo antes de contestar.
- "encabezado" es el nombre del negocio impreso arriba del ticket, tal cual (por ejemplo "BIZNAGA BAJA BISTRO ROOF EXPERIENCE").

CAMPOS QUE NO PUEDAS LEER
El esquema obliga a mandar todos los campos, así que cuando un dato NO aparece en el ticket o no lo lees con certeza:
1. Manda 0 (o "" si es texto) en ese campo, y
2. Agrega su nombre exacto a "camposNoLegibles".

Esa lista es la única forma de decir "no lo leí": los campos que NO estén ahí se toman como leídos con certeza y se guardan en la contabilidad. NUNCA inventes ni estimes un valor.

Ojo con la diferencia: si el ticket dice "VALES: $0.00", entonces pagoVales es 0 y NO va en camposNoLegibles, porque sí lo leíste. Solo van los que están ausentes o ilegibles.`;

const USER_PROMPT =
  "Extrae los datos del ticket CORTE Z de esta foto. Recuerda: solo del Corte Z, y lista en camposNoLegibles todo lo que no se lea con certeza.";

/** Lee un corte de caja desde una foto o un PDF usando el modelo de visión. */
export async function parseCorteVision(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<CorteExtraction> {
  if (!visionAvailable()) {
    throw new VisionError("Falta configurar ANTHROPIC_API_KEY para leer archivos del corte.");
  }

  const isPdf = mediaType === PDF_MEDIA_TYPE;
  const limit = isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (buffer.byteLength > limit) {
    throw new VisionError(
      isPdf
        ? "El PDF pesa más de 20 MB. Sube solo las páginas del corte."
        : "La foto pesa más de 5 MB. Vuelve a tomarla con menor resolución o compártela comprimida.",
    );
  }

  const data = buffer.toString("base64");
  // El PDF viaja como documento (el modelo lee su texto y su formato); las
  // fotos van como imagen.
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? { type: "document", source: { type: "base64", media_type: PDF_MEDIA_TYPE, data } }
    : { type: "image", source: { type: "base64", media_type: mediaType, data } };

  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: [fileBlock, { type: "text", text: USER_PROMPT }],
      },
    ],
    // El esfuerzo alto (por defecto) tardaba ~60s, por encima del corte de la
    // ruta y demasiado para un cajero esperando. En "medium" la lectura del
    // ticket sale igual de precisa en bastante menos tiempo.
    output_config: { effort: "medium", format: zodOutputFormat(CorteSchema) },
  });

  if (response.stop_reason === "refusal") {
    throw new VisionError("El modelo no pudo procesar este archivo. Captura los datos a mano.");
  }
  const parsed = response.parsed_output;
  if (!parsed) {
    throw new VisionError("No se pudo leer el corte. Intenta con otro archivo o captura a mano.");
  }

  const { encabezado, camposNoLegibles, ...fields } = parsed;
  const ilegibles = new Set(camposNoLegibles ?? []);

  const draft: CorteDraft = {};
  const detected: (keyof CorteDraft)[] = [];
  for (const [key, value] of Object.entries(fields)) {
    // Lo que el modelo marcó como ilegible viene relleno con 0 / "" para
    // cumplir el esquema: descartarlo es justo lo que evita guardar un número
    // inventado. El usuario lo captura a mano en la pantalla de revisión.
    if (ilegibles.has(key)) continue;
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
    warnings: validarCuadres(draft),
  };
}
