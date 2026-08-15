import Link from "next/link";
import { getLinkedDocuments } from "@/lib/documents/queries";
import { DocumentIcon } from "@/components/document-icon";
import { documentCategoryLabels } from "@/lib/labels";
import { formatFileSize } from "@/lib/utils";
import { DocumentUploadForm } from "@/components/document-upload-form";

interface Props {
  venues: { id: string; name: string }[];
  venueId: string;
  redirectTo: string;
  corteId?: string;
  entryId?: string;
  bankTransactionId?: string;
}

/** Sección "Documentos" para incrustar en el detalle de un corte / movimiento. */
export async function LinkedDocuments({ venues, venueId, redirectTo, corteId, entryId, bankTransactionId }: Props) {
  const docs = await getLinkedDocuments({ corteId, entryId, bankTransactionId });

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-base font-semibold">Documentos</h2>
      {docs.length > 0 && (
        <ul className="mb-4 space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <Link
                href={`/documentos/${d.id}`}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/50"
              >
                <DocumentIcon mime={d.mime} className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {documentCategoryLabels[d.category]} · {formatFileSize(d.size)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <details className="text-sm">
        <summary className="cursor-pointer text-brand-600 hover:underline">
          + Adjuntar documento
        </summary>
        <div className="mt-3">
          <DocumentUploadForm
            venues={venues}
            defaultVenueId={venueId}
            redirectTo={redirectTo}
            corteId={corteId}
            entryId={entryId}
            bankTransactionId={bankTransactionId}
          />
        </div>
      </details>
    </div>
  );
}
