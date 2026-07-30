import { createWorker } from "tesseract.js";
import os from "node:os";

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
 * `onProgress` recibe los eventos del logger interno de Tesseract (carga del
 * motor, descarga del idioma, reconocimiento) para poder reportar avance real.
 */
export function createOcrWorker(lang: string, onProgress?: (p: OcrProgress) => void) {
  return createWorker(lang, undefined, {
    cachePath: os.tmpdir(),
    ...(onProgress
      ? { logger: (m: { status: string; progress: number }) => onProgress(m) }
      : {}),
  });
}
