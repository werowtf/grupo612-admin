import { createWorker } from "tesseract.js";
import os from "node:os";

/**
 * Crea un worker de Tesseract con `cachePath` apuntando al directorio temporal
 * del sistema. Por defecto, tesseract.js intenta cachear los datos de idioma
 * en el directorio de trabajo actual (`fs.writeFile` sin manejo de errores),
 * el cual es de sólo lectura en entornos serverless como Vercel — sólo `/tmp`
 * es escribible ahí. `os.tmpdir()` resuelve correctamente tanto en desarrollo
 * (Windows/macOS/Linux) como en producción.
 */
export function createOcrWorker(lang: string) {
  return createWorker(lang, undefined, { cachePath: os.tmpdir() });
}
