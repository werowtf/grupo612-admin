import { createWorker } from "tesseract.js";
import os from "node:os";
import path from "node:path";

export interface OcrProgress {
  status: string;
  progress: number; // 0..1
}

/**
 * Crea un worker de Tesseract con `cachePath` apuntando al directorio temporal
 * del sistema. Por defecto, tesseract.js intenta cachear los datos de idioma
 * en el directorio de trabajo actual (`fs.writeFile` sin manejo de errores),
 * el cual es de sólo lectura en entornos serverless como Vercel — sólo `/tmp`
 * es escribible ahí. `os.tmpdir()` resuelve correctamente tanto en desarrollo
 * (Windows/macOS/Linux) como en producción.
 *
 * `langPath` apunta al `.traineddata` empaquetado en el repo (`tessdata/`) en
 * vez de dejar que tesseract.js lo descargue de jsdelivr en cada arranque en
 * frío — esa descarga por red, sumada al arranque frío de la función, puede
 * tardar más que el timeout y dejar el OCR colgado en producción (Vercel).
 * El archivo local no está gzipeado, de ahí `gzip: false`. Ver
 * `next.config.ts` (`outputFileTracingIncludes`) para su empaquetado.
 *
 * `onProgress` recibe los eventos del logger interno de Tesseract (carga del
 * motor, lectura del idioma, reconocimiento) para poder reportar avance real.
 */
export function createOcrWorker(lang: string, onProgress?: (p: OcrProgress) => void) {
  return createWorker(lang, undefined, {
    cachePath: os.tmpdir(),
    langPath: path.join(process.cwd(), "tessdata"),
    gzip: false,
    ...(onProgress
      ? { logger: (m: { status: string; progress: number }) => onProgress(m) }
      : {}),
  });
}
