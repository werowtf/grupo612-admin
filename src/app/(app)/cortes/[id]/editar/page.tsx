import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CorteEditor } from "@/components/corte-editor";
import { ALL_CORTE_FIELDS } from "@/lib/cortes/fields";
import { formatDate } from "@/lib/utils";

export default async function EditarCortePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const corte = await prisma.corte.findUnique({
    where: { id },
    include: { venue: true },
  });
  if (!corte) notFound();

  const hasAccess =
    user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === corte.venueId);
  if (!hasAccess) notFound();

  // Serializar el corte a valores de formulario (strings).
  const record = corte as unknown as Record<string, unknown>;
  const initialValues: Record<string, string> = {
    date: corte.date.toISOString().slice(0, 10),
    fileName: corte.fileName ?? "",
    notes: corte.notes ?? "",
  };
  for (const f of ALL_CORTE_FIELDS) {
    if (f.key === "date") continue;
    const v = record[f.key];
    if (v !== null && v !== undefined) initialValues[f.key] = String(v);
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/cortes/${corte.id}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al corte
        </Link>
        <h1 className="mt-1 text-xl">
          Editar corte · {formatDate(corte.date)}
        </h1>
        <p className="text-sm text-muted-foreground">{corte.venue.name}</p>
      </div>

      <CorteEditor
        venueId={corte.venueId}
        venueName={corte.venue.name}
        corteId={corte.id}
        initialValues={initialValues}
        initialSource={corte.source}
      />
    </div>
  );
}
