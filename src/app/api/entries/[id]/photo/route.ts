import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const entry = await prisma.financialEntry.findUnique({
    where: { id },
    select: { photo: true, photoMime: true, venueId: true },
  });
  if (!entry?.photo) return new Response("No encontrado", { status: 404 });

  const hasAccess =
    user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === entry.venueId);
  if (!hasAccess) return new Response("Prohibido", { status: 403 });

  return new Response(new Uint8Array(entry.photo), {
    headers: {
      "Content-Type": entry.photoMime ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
