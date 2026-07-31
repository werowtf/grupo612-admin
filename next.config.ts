import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js resuelve su worker script con rutas basadas en __dirname
  // (node_modules/tesseract.js/src/worker-script/node/index.js); lo excluimos
  // del bundling de Server Components para que esas rutas no se rompan en
  // producción (Vercel). `pg` y `@prisma/client` ya vienen excluidos por Next.
  serverExternalPackages: ["tesseract.js"],
  // Sin esto, tesseract.js descargaría spa.traineddata desde jsdelivr en cada
  // arranque en frío de la función serverless — en producción esa descarga
  // (+ la red del propio Vercel) puede tardar más que el timeout, dejando el
  // OCR colgado. Empaquetamos el archivo localmente (ver ocr-worker.ts) y
  // forzamos su inclusión en el bundle de las rutas de OCR.
  //
  // Además, `worker-script/node/index.js` de tesseract.js hace `require('..')`
  // (resuelve a `worker-script/index.js`, un nivel arriba). El trazador de
  // archivos de Vercel no sigue ese patrón de forma confiable, así que ese
  // archivo quedaba fuera del bundle en producción: el worker_threads.Worker
  // crasheaba al cargar ("Cannot find module '..'") antes de poder avisar,
  // y la petición se quedaba colgada hasta el timeout propio. Se fuerza la
  // inclusión completa de tesseract.js y tesseract.js-core para evitarlo.
  outputFileTracingIncludes: {
    "/api/cortes/ocr": ["./tessdata/**", "./node_modules/tesseract.js/**", "./node_modules/tesseract.js-core/**"],
    "/api/entries/ocr": ["./tessdata/**", "./node_modules/tesseract.js/**", "./node_modules/tesseract.js-core/**"],
  },
};

export default nextConfig;
