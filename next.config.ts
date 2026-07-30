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
  outputFileTracingIncludes: {
    "/api/cortes/ocr": ["./tessdata/**"],
    "/api/entries/ocr": ["./tessdata/**"],
  },
};

export default nextConfig;
