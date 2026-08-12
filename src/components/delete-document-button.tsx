"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteDocumentAction } from "@/app/(app)/documentos/actions";
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

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  const [pending, start] = useTransition();
  function onDelete() {
    start(() => {
      void deleteDocumentAction(documentId);
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
          <AlertDialogTitle>¿Eliminar este documento?</AlertDialogTitle>
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
