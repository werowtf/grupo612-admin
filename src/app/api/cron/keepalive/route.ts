import { prisma } from "@/lib/prisma";

/**
 * Ping periódico para que Supabase (plan Free) no marque el proyecto como
 * inactivo: la app se conecta directo a Postgres vía Prisma, sin pasar por
 * el Data API/Auth de Supabase, así que su detector de inactividad no ve
 * ese tráfico. Disparado por Vercel Cron (ver vercel.json).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return new Response("No autorizado", { status: 401 });
    }
  }

  await prisma.$queryRaw`SELECT 1`;
  return Response.json({ ok: true, at: new Date().toISOString() });
}
