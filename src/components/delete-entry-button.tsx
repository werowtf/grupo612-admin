"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEntryAction } from "@/app/(app)/ingresos-egresos/actions";

export function DeleteEntryButton({
  entryId,
  redirectTo = "/ingresos-egresos",
}: {
  entryId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onDelete() {
    if (!confirm("¿Eliminar este movimiento? Esta acción no se puede deshacer.")) return;
    start(async () => {
      await deleteEntryAction(entryId);
      router.push(redirectTo);
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
