"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDocumentAction } from "@/app/(app)/documentos/actions";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [pending, start] = useTransition();
  function onDelete() {
    if (!confirm("¿Eliminar este documento? Esta acción no se puede deshacer.")) return;
    start(() => {
      void deleteDocumentAction(documentId);
    });
  }
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="btn-ghost text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
