import { getCurrentUser } from "@/lib/auth";
import { parseCorteImage } from "@/lib/cortes/ocr";
import {
  parseCorteVision,
  resolveMediaType,
  visionAvailable,
  VisionError,
} from "@/lib/cortes/vision";

// El OCR (descarga del idioma + reconocimiento) puede tardar más que el límite
// por defecto de una función serverless; ampliamos el máximo permitido.
export const maxDuration = 60;

// Si Tesseract se cuelga (ticket dañado, red lenta) cortamos antes de que
// expire la función, para siempre devolver una respuesta al cliente.
const HARD_TIMEOUT_MS = 50_000;

function line(obj: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(obj) + "\n");
}

const NDJSON_HEADERS = { "Content-Type": "application/x-ndjson; charset=utf-8" };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ type: "done", ok: false, error: "Sesión expirada." }) + "\n", {
      status: 401,
      headers: NDJSON_HEADERS,
    });
  }

  let file: File | null = null;
  try {
    const formData = await req.formData();
    const f = formData.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } catch {
    // formData inválido; se maneja abajo con file === null
  }

  if (!file) {
    return new Response(
      JSON.stringify({ type: "done", ok: false, error: "Selecciona una foto del ticket." }) + "\n",
      { status: 400, headers: NDJSON_HEADERS },
    );
  }
  const buffer = Buffer.from(await file.arrayBuffer());

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const safeEnqueue = (obj: unknown) => {
        if (!closed) {
          try {
            controller.enqueue(line(obj));
          } catch {
            // el cliente ya cerró la conexión; ignoramos
          }
        }
      };
      const finish = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };

      const timeout = setTimeout(() => {
        safeEnqueue({
          type: "done",
          ok: false,
          error:
            "El procesamiento tardó demasiado. Intenta con una foto más ligera/nítida o captura los datos manualmente.",
        });
        finish();
      }, HARD_TIMEOUT_MS);

      try {
        let result;
        if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") {
          // El PDF de Soft Restaurant se lee en local sin llamar a ningún
          // servicio; solo si viene escaneado cae al modelo de visión.
          safeEnqueue({ type: "progress", status: "leyendo el PDF", progress: 0.5 });
          const { parseCortePdf } = await import("@/lib/cortes");
          result = await parseCortePdf(buffer);
        } else if (visionAvailable()) {
          // El modelo de visión no reporta avance parcial, así que mandamos un
          // solo evento para que la UI no se quede sin retroalimentación.
          safeEnqueue({ type: "progress", status: "leyendo la foto", progress: 0.3 });
          const mediaType = resolveMediaType(file.name, file.type);
          result = await parseCorteVision(buffer, mediaType);
        } else {
          result = await parseCorteImage(buffer, (p) => {
            safeEnqueue({ type: "progress", status: p.status, progress: p.progress });
          });
        }
        clearTimeout(timeout);
        safeEnqueue({ type: "done", ok: true, result });
      } catch (err) {
        clearTimeout(timeout);
        console.error("Error al leer el corte:", err);
        safeEnqueue({
          type: "done",
          ok: false,
          // VisionError trae un mensaje accionable (formato, tamaño, credencial);
          // cualquier otro error se reporta en genérico.
          error:
            err instanceof VisionError
              ? err.message
              : "No se pudo leer el ticket. Intenta con otra foto o captura los datos manualmente.",
        });
      } finally {
        finish();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
