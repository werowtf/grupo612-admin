import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CORTE_SECTIONS } from "@/lib/cortes/fields";
import { getCorteMatching } from "@/lib/cortes/matching";
import { formatMXN, formatDate } from "@/lib/utils";
import { DeleteCorteButton } from "@/components/delete-corte-button";
import { CorteMatching } from "@/components/corte-matching";
import { LinkedDocuments } from "@/components/linked-documents";
import { getAccessibleVenues } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/button";

const sourceLabels: Record<string, string> = {
  MANUAL: "Captura manual",
  EXCEL: "Excel (Soft Restaurant)",
  OCR: "Foto (OCR)",
};

export default async function CorteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const corte = await prisma.corte.findUnique({
    where: { id },
    include: { venue: true, createdBy: { select: { name: true } } },
  });
  if (!corte) notFound();

  const hasAccess =
    user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === corte.venueId);
  if (!hasAccess) notFound();

  const matching = await getCorteMatching(corte);

  const format = (key: string, type: string) => {
    const value = (corte as unknown as Record<string, unknown>)[key];
    if (value === null || value === undefined) return "—";
    if (type === "money") return formatMXN(value as string);
    if (type === "date") return formatDate(value as Date);
    return String(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/cortes"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Cortes de caja
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            Corte {corte.folioCorteZ ? `#${corte.folioCorteZ}` : ""} · {formatDate(corte.date)}
          </h1>
          <p className="text-sm text-[var(--color-muted)]">
            {corte.venue.name} · {sourceLabels[corte.source] ?? corte.source}
            {corte.createdBy?.name ? ` · por ${corte.createdBy.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/cortes/${corte.id}/editar`} className={buttonVariants({ variant: "outline" })}>
            <Pencil className="h-4 w-4" />
            Editar
          </Link>
          <DeleteCorteButton corteId={corte.id} />
        </div>
      </div>

      <CorteMatching
        corteId={corte.id}
        cardTotal={matching.cardTotal}
        linked={matching.linked}
        linkedTotal={matching.linkedTotal}
        suggestions={matching.suggestions}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {CORTE_SECTIONS.map((section) => (
          <div key={section.title} className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
              {section.title}
            </h2>
            <dl className="divide-y divide-[var(--color-border)]">
              {section.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between py-1.5 text-sm">
                  <dt className="text-[var(--color-muted)]">{f.label}</dt>
                  <dd className="tabular-nums font-medium">{format(f.key, f.type)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {corte.notes && (
        <div className="card p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            Notas
          </h2>
          <p className="text-sm">{corte.notes}</p>
        </div>
      )}

      <LinkedDocuments
        venues={(await getAccessibleVenues(user)).map((v) => ({ id: v.id, name: v.name }))}
        venueId={corte.venueId}
        redirectTo={`/cortes/${corte.id}`}
        corteId={corte.id}
      />
    </div>
  );
}
