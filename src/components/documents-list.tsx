import Link from "next/link";
import { Download } from "lucide-react";
import { DocumentIcon } from "@/components/document-icon";
import { documentCategoryLabels } from "@/lib/labels";
import { formatDate, formatFileSize } from "@/lib/utils";
import type { DocumentCategory } from "@/generated/prisma/enums";

export interface DocRow {
  id: string;
  title: string;
  category: DocumentCategory;
  tags: string | null;
  fileName: string;
  mime: string;
  size: number;
  createdAt: Date;
}

export function DocumentsList({ rows, emptyText }: { rows: DocRow[]; emptyText?: string }) {
  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted-foreground">
        {emptyText ?? "No hay documentos."}
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((d) => (
        <li key={d.id} className="card min-w-0 p-4">
          <Link href={`/documentos/${d.id}`} className="flex items-start gap-3">
            <DocumentIcon mime={d.mime} className="mt-0.5 h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{d.title}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {documentCategoryLabels[d.category]} · {formatFileSize(d.size)}
              </div>
              <div className="text-xs text-muted-foreground">{formatDate(d.createdAt)}</div>
            </div>
          </Link>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
            <span className="truncate text-xs text-muted-foreground">{d.fileName}</span>
            <a
              href={`/api/documents/${d.id}/file?download=1`}
              className="shrink-0 text-muted-foreground hover:text-brand-600"
              title="Descargar"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        </li>
      ))}
    </ul>
  );
}
