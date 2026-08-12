import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Link2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentCategoryLabels } from "@/lib/labels";
import { formatDate, formatFileSize } from "@/lib/utils";
import { DeleteDocumentButton } from "@/components/delete-document-button";
import { buttonVariants } from "@/components/ui/button";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      venue: true,
      uploadedBy: { select: { name: true } },
      corte: { select: { id: true, date: true, folioCorteZ: true } },
      entry: { select: { id: true, date: true, category: true } },
      bankTransaction: { select: { id: true, description: true, date: true } },
    },
  });
  if (!doc) notFound();
  const hasAccess = user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === doc.venueId);
  if (!hasAccess) notFound();

  const isPreviewable = doc.mime.startsWith("image/") || doc.mime === "application/pdf";
  const fileUrl = `/api/documents/${doc.id}/file`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/documentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--color-fg)]">
            <ArrowLeft className="h-4 w-4" />
            Documentos
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.venue.name} · {documentCategoryLabels[doc.category]}
            {doc.uploadedBy?.name ? ` · subido por ${doc.uploadedBy.name}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${fileUrl}?download=1`} className={buttonVariants({ variant: "outline" })}>
            <Download className="h-4 w-4" /> Descargar
          </a>
          <DeleteDocumentButton documentId={doc.id} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <dl className="divide-y divide-[var(--color-border)] text-sm">
            <Row k="Archivo" v={doc.fileName} />
            <Row k="Tamaño" v={formatFileSize(doc.size)} />
            <Row k="Subido" v={formatDate(doc.createdAt)} />
            {doc.tags && <Row k="Etiquetas" v={doc.tags} />}
          </dl>
          {doc.notes && (
            <p className="mt-3 border-t border-[var(--color-border)] pt-3 text-sm">{doc.notes}</p>
          )}

          {(doc.corte || doc.entry || doc.bankTransaction) && (
            <div className="mt-4 border-t border-[var(--color-border)] pt-3">
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Link2 className="h-3.5 w-3.5" />
                Vinculado a
              </h3>
              {doc.corte && (
                <Link href={`/cortes/${doc.corte.id}`} className="text-sm text-brand-700 hover:underline">
                  Corte {doc.corte.folioCorteZ ? `#${doc.corte.folioCorteZ}` : ""} · {formatDate(doc.corte.date)}
                </Link>
              )}
              {doc.entry && (
                <Link href={`/ingresos-egresos/${doc.entry.id}`} className="block text-sm text-brand-700 hover:underline">
                  Movimiento {doc.entry.category} · {formatDate(doc.entry.date)}
                </Link>
              )}
              {doc.bankTransaction && (
                <Link href="/movimientos" className="block text-sm text-brand-700 hover:underline">
                  {doc.bankTransaction.description} · {formatDate(doc.bankTransaction.date)}
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Vista previa
          </h2>
          {doc.mime.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fileUrl} alt={doc.title} className="max-h-[480px] w-full rounded-lg border border-[var(--color-border)] object-contain" />
          ) : doc.mime === "application/pdf" ? (
            <iframe src={fileUrl} title={doc.title} className="h-[480px] w-full rounded-lg border border-[var(--color-border)]" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Vista previa no disponible para este tipo de archivo. Usa &quot;Descargar&quot;.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}
