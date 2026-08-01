"use client";

import { useActionState, useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";
import { uploadDocumentAction, type DocumentFormState } from "@/app/(app)/documentos/actions";
import { DOCUMENT_CATEGORIES, documentCategoryLabels } from "@/lib/labels";

interface Props {
  venues: { id: string; name: string }[];
  defaultVenueId: string;
  redirectTo?: string;
  corteId?: string;
  entryId?: string;
  bankTransactionId?: string;
}

const init: DocumentFormState = {};

export function DocumentUploadForm({
  venues,
  defaultVenueId,
  redirectTo,
  corteId,
  entryId,
  bankTransactionId,
}: Props) {
  const [state, action, pending] = useActionState(uploadDocumentAction, init);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");

  return (
    <form action={action} className="card space-y-4 p-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      {corteId && <input type="hidden" name="corteId" value={corteId} />}
      {entryId && <input type="hidden" name="entryId" value={entryId} />}
      {bankTransactionId && <input type="hidden" name="bankTransactionId" value={bankTransactionId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="title">Título</label>
          <input id="title" name="title" required className="input" placeholder="p.ej. Factura renta julio 2026" />
        </div>

        {venues.length > 1 ? (
          <div>
            <label className="label" htmlFor="venueId">Negocio</label>
            <select id="venueId" name="venueId" defaultValue={defaultVenueId} className="input">
              {venues.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="venueId" value={defaultVenueId} />
        )}

        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <select id="category" name="category" defaultValue="OTRO" className="input">
            {DOCUMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{documentCategoryLabels[c]}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="file">Archivo</label>
          <input
            ref={fileRef}
            id="file"
            name="file"
            type="file"
            required
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Elegir archivo
            </button>
            <span className="text-sm text-[var(--color-muted)]">
              {fileName || "Ningún archivo seleccionado"}
            </span>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">Etiquetas (opcional)</label>
          <input id="tags" name="tags" className="input" placeholder="separadas, por, coma" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notas (opcional)</label>
          <input id="notes" name="notes" className="input" />
        </div>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          <UploadCloud className="h-4 w-4" />
          {pending ? "Subiendo…" : "Subir documento"}
        </button>
      </div>
    </form>
  );
}
