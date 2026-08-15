"use client";

import { useActionState, useRef, useState } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";
import { uploadDocumentAction, type DocumentFormState } from "@/app/(app)/documentos/actions";
import { DOCUMENT_CATEGORIES, documentCategoryLabels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FIELD_TRIGGER_CLASS = "h-8 w-full border-input bg-transparent font-normal text-foreground hover:bg-muted/50";

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
          <Input id="title" name="title" required placeholder="p.ej. Factura renta julio 2026" />
        </div>

        {venues.length > 1 ? (
          <div>
            <label className="label" htmlFor="venueId">Negocio</label>
            <Select name="venueId" defaultValue={defaultVenueId}>
              <SelectTrigger id="venueId" className={FIELD_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {venues.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <input type="hidden" name="venueId" value={defaultVenueId} />
        )}

        <div>
          <label className="label" htmlFor="category">Categoría</label>
          <Select name="category" defaultValue="OTRO">
            <SelectTrigger id="category" className={FIELD_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{documentCategoryLabels[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <span className="text-sm text-muted-foreground">
              {fileName || "Ningún archivo seleccionado"}
            </span>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">Etiquetas (opcional)</label>
          <Input id="tags" name="tags" placeholder="separadas, por, coma" />
        </div>
        <div>
          <label className="label" htmlFor="notes">Notas (opcional)</label>
          <Input id="notes" name="notes" />
        </div>
      </div>

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <UploadCloud className="h-4 w-4" />
          {pending ? "Subiendo…" : "Subir documento"}
        </Button>
      </div>
    </form>
  );
}
