import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entryTypeLabels, paymentLabels, sourceLabels } from "@/lib/entries/config";
import { formatMXN, formatDate } from "@/lib/utils";
import { DeleteEntryButton } from "@/components/delete-entry-button";
import { LinkedDocuments } from "@/components/linked-documents";
import { buttonVariants } from "@/components/ui/button";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const entry = await prisma.financialEntry.findUnique({
    where: { id },
    include: { venue: true, createdBy: { select: { name: true } } },
  });
  if (!entry) notFound();
  const hasAccess = user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === entry.venueId);
  if (!hasAccess) notFound();

  const isEgreso = entry.type === "EGRESO";
  const rows: [string, string][] = [
    ["Tipo", entryTypeLabels[entry.type]],
    ["Categoría", entry.category],
    ["Proveedor / origen", entry.supplier ?? "—"],
    ["Forma de pago", paymentLabels[entry.paymentMethod]],
    ["Folio", entry.folio ?? "—"],
    ["RFC", entry.rfc ?? "—"],
    ["Referencia", entry.reference ?? "—"],
    ["Origen del registro", sourceLabels[entry.source]],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/ingresos-egresos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Ingresos y egresos
          </Link>
          <h1 className="mt-1 text-xl">
            {entryTypeLabels[entry.type]} · {formatDate(entry.date)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {entry.venue.name}
            {entry.createdBy?.name ? ` · registró ${entry.createdBy.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/ingresos-egresos/${entry.id}/editar`} className={buttonVariants({ variant: "outline" })}>
            <Pencil className="h-4 w-4" /> Editar
          </Link>
          <DeleteEntryButton entryId={entry.id} />
        </div>
      </div>

      <div className={`text-3xl font-semibold tabular-nums ${isEgreso ? "text-cargo" : "text-abono"}`}>
        {isEgreso ? "−" : "+"}
        {formatMXN(entry.amount)}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card min-w-0 p-5">
          <dl className="divide-y divide-border">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          {entry.description && (
            <p className="mt-3 border-t border-border pt-3 text-sm">
              {entry.description}
            </p>
          )}
          {entry.notes && (
            <p className="mt-2 text-sm text-muted-foreground">Notas: {entry.notes}</p>
          )}
        </div>

        {entry.photoMime && (
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Ticket
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/entries/${entry.id}/photo`}
              alt="Ticket de compra"
              className="max-h-[480px] w-full rounded-lg border border-border object-contain"
            />
          </div>
        )}
      </div>

      <LinkedDocuments
        venues={(await getAccessibleVenues(user)).map((v) => ({ id: v.id, name: v.name }))}
        venueId={entry.venueId}
        redirectTo={`/ingresos-egresos/${entry.id}`}
        entryId={entry.id}
      />
    </div>
  );
}
