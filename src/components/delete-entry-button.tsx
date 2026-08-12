"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteEntryAction } from "@/app/(app)/ingresos-egresos/actions";
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
  redirectTo = "/ingresos-egresos",
}: {
  entryId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function onDelete() {
    start(async () => {
      await deleteEntryAction(entryId);
      router.push(redirectTo);
    });
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={pending} />}>
        <Trash2 className="h-4 w-4" />
        {pending ? "Eliminando…" : "Eliminar"}
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
