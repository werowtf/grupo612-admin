import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { file: true, mime: true, fileName: true, venueId: true },
  });
  if (!doc) return new Response("No encontrado", { status: 404 });

  const hasAccess =
    user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === doc.venueId);
  if (!hasAccess) return new Response("Prohibido", { status: 403 });

  const download = new URL(req.url).searchParams.get("download") === "1";
  const disposition = download ? "attachment" : "inline";

  return new Response(new Uint8Array(doc.file), {
    headers: {
      "Content-Type": doc.mime,
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(doc.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
