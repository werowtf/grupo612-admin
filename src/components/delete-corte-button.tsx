"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCorteAction } from "@/app/(app)/cortes/actions";

export function DeleteCorteButton({ corteId }: { corteId: string }) {
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm("¿Eliminar este corte de caja? Esta acción no se puede deshacer.")) {
      return;
    }
    start(() => {
      void deleteCorteAction(corteId);
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
