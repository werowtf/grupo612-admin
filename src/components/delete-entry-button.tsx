"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEntryAction } from "@/app/(app)/ingresos-egresos/actions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteEntryButton({
  entryId,
  redirectTo,
  iconOnly = false,
  onDeleted,
}: {
  entryId: string;
  redirectTo?: string;
  /** Sólo el ícono de bote de basura (para usar inline en una fila de tabla). */
  iconOnly?: boolean;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onDelete() {
    start(async () => {
      await deleteEntryAction(entryId);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
      onDeleted?.();
    });
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={iconOnly ? "ghost" : "destructive"}
            size={iconOnly ? "icon-sm" : "default"}
            disabled={pending}
            title={iconOnly ? "Eliminar" : undefined}
          />
        }
      >
        <Trash2 className={cn("h-4 w-4", iconOnly && "text-danger")} />
        {!iconOnly && (pending ? "Eliminando…" : "Eliminar")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este movimiento?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
