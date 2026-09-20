import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  VisionError,
  visionAvailable,
  type SupportedMediaType,
} from "@/lib/cortes/vision";
import type { TicketDraft, TicketExtraction } from "./ticket";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const PDF_MEDIA_TYPE = "application/pdf";

// Todos los campos son obligatorios (límite de campos opcionales de las salidas
// estructuradas); lo que no se lea se reporta en `camposNoLegibles`.
const TicketSchema = z.object({
  camposNoLegibles: z
    .array(z.string())
    .describe(
      "Nombres de los campos que no aparecen en el ticket o no se leen con certeza",
    ),
  supplier: z
    .string()
    .describe("Nombre del comercio o proveedor, tal como está impreso"),
  date: z.string().describe("Fecha del ticket en formato yyyy-mm-dd"),
  amount: z.number().describe("Total pagado, sin '$' ni separadores de miles"),
  folio: z.string().describe("Folio, número de ticket, nota o factura"),
  rfc: z.string().describe("RFC del emisor, en mayúsculas"),
});

const SYSTEM = `Eres un asistente contable de Grupo 612 (restaurantes en La Paz, BCS). Extraes los datos de un ticket o nota de compra para registrarlo como egreso.

REGLAS
- "amount" es el TOTAL final a pagar (no el subtotal, ni el IVA, ni el cambio, ni el importe recibido). Número plano: 1234.50, no "$1,234.50".
- "date" en formato yyyy-mm-dd. Las fechas de México vienen como dd/mm/aaaa: 05/08/2026 es el 5 de agosto de 2026, no el 8 de mayo.
- "supplier" es el nombre del comercio (encabezado del ticket), no la dirección ni el eslogan.
- "folio" es el folio / ticket / nota / factura. "rfc" es el RFC del emisor (12 o 13 caracteres).
- Si la imagen trae varios documentos, usa solo el ticket de compra principal.

CAMPOS QUE NO PUEDAS LEER
El esquema obliga a mandar todos los campos. Cuando un dato NO aparece o no lo lees con certeza, manda 0 (o "" si es texto) y agrega su nombre exacto a "camposNoLegibles". Esa lista es la única forma de decir "no lo leí": nunca inventes ni estimes un valor.`;

const USER_PROMPT =
  "Extrae los datos de este ticket de compra. Lista en camposNoLegibles todo lo que no se lea con certeza.";

/** Lee un ticket de compra (foto o PDF) con el modelo de visión. */
export async function parseTicketVision(
  buffer: Buffer,
  mediaType: SupportedMediaType,
): Promise<TicketExtraction> {
  if (!visionAvailable()) {
    throw new VisionError(
      "Falta configurar ANTHROPIC_API_KEY para leer tickets.",
    );
  }
  const isPdf = mediaType === PDF_MEDIA_TYPE;
  if (buffer.byteLength > (isPdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES)) {
    throw new VisionError(
      "El archivo es demasiado pesado para el modelo de visión.",
    );
  }

  const data = buffer.toString("base64");
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? {
        type: "document",
        source: { type: "base64", media_type: PDF_MEDIA_TYPE, data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data },
      };

  const client = new Anthropic();
  const response = await client.messages.parse(
    {
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: USER_PROMPT }],
        },
      ],
      output_config: {
        effort: "medium",
        format: zodOutputFormat(TicketSchema),
      },
    },
    {
      // Tope corto y sin reintentos: si el modelo tarda, queda tiempo para que
      // el respaldo (Tesseract) responda antes del límite de la ruta.
      timeout: 25_000,
      maxRetries: 0,
    },
  );

  if (response.stop_reason === "refusal") {
    throw new VisionError("El modelo no pudo procesar este archivo.");
  }
  const parsed = response.parsed_output;
  if (!parsed) throw new VisionError("No se pudo leer el ticket.");

  const { camposNoLegibles, ...fields } = parsed;
  const ilegibles = new Set(camposNoLegibles ?? []);
  const draft: TicketDraft = {};
  const detected: (keyof TicketDraft)[] = [];

  const put = <K extends keyof TicketDraft>(
    key: K,
    value: TicketDraft[K] | undefined,
  ) => {
    if (
      ilegibles.has(key) ||
      value === undefined ||
      value === "" ||
      value === null
    )
      return;
    draft[key] = value;
    detected.push(key);
  };
  put("amount", fields.amount > 0 ? fields.amount : undefined);
  put(
    "date",
    /^\d{4}-\d{2}-\d{2}$/.test(fields.date) ? fields.date : undefined,
  );
  put("folio", fields.folio.trim() || undefined);
  put("rfc", fields.rfc.trim().toUpperCase() || undefined);
  put("supplier", fields.supplier.trim().slice(0, 60) || undefined);

  return { draft, rawText: "", detected };
}
