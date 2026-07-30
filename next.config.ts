import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tesseract.js resuelve su worker script con rutas basadas en __dirname
  // (node_modules/tesseract.js/src/worker-script/node/index.js); lo excluimos
  // del bundling de Server Components para que esas rutas no se rompan en
  // producción (Vercel). `pg` y `@prisma/client` ya vienen excluidos por Next.
  serverExternalPackages: ["tesseract.js"],
};

export default nextConfig;
