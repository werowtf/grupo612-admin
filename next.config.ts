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
  // Además, al estar en serverExternalPackages, el trazador de archivos de
  // Vercel no sigue los `require(...)` internos de tesseract.js (ni los suyos
  // propios como `require('..')` en worker-script/node/index.js, ni los de
  // sus dependencias declaradas). El worker_threads.Worker crasheaba al
  // cargar ("Cannot find module '..'", luego "Cannot find module 'bmp-js'")
  // antes de poder avisar, y la petición se quedaba colgada hasta el timeout
  // propio en vez de fallar rápido. Se fuerza la inclusión completa de
  // tesseract.js y de cada dependencia suya que su ruta Node realmente usa en
  // tiempo de ejecución (ver los `require` en node_modules/tesseract.js/src/
  // worker-script/node/** y worker/node/**; node-fetch se descarta porque el
  // propio paquete usa `global.fetch` en Node 18+ vía `||` corto-circuito).
  outputFileTracingIncludes: {
    "/api/cortes/ocr": [
      "./tessdata/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/bmp-js/**",
      "./node_modules/is-url/**",
      "./node_modules/regenerator-runtime/**",
      "./node_modules/wasm-feature-detect/**",
    ],
    "/api/entries/ocr": [
      "./tessdata/**",
      "./node_modules/tesseract.js/**",
      "./node_modules/tesseract.js-core/**",
      "./node_modules/bmp-js/**",
      "./node_modules/is-url/**",
      "./node_modules/regenerator-runtime/**",
      "./node_modules/wasm-feature-detect/**",
    ],
  },
};

export default nextConfig;
