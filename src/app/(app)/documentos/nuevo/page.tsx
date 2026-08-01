import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { DocumentUploadForm } from "@/components/document-upload-form";

export default async function NuevoDocumentoPage() {
  const { venues, selected } = await getAppContext();
  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-[var(--color-muted)]">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/documentos" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          <ArrowLeft className="h-4 w-4" />
          Documentos
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Subir documento</h1>
      </div>

      <DocumentUploadForm
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        defaultVenueId={selected.id}
        redirectTo="/documentos"
      />
    </div>
  );
}
