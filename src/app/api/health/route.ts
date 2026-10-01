import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/health — usado por el despliegue (GitHub Actions) para confirmar
// que el contenedor nuevo ya responde y tiene conexión a la base de datos.
export async function GET() {
  await prisma.$queryRaw`select 1`;
  return Response.json({ ok: true });
}
