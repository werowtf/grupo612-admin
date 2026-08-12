"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteCorteAction } from "@/app/(app)/cortes/actions";
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

export function DeleteCorteButton({ corteId }: { corteId: string }) {
  const [pending, start] = useTransition();

  function onDelete() {
    start(() => {
      void deleteCorteAction(corteId);
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
          <AlertDialogTitle>¿Eliminar este corte de caja?</AlertDialogTitle>
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
