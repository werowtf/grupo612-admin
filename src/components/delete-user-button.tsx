"use client";

import { useState, useTransition } from "react";
import { Trash2, AlertCircle } from "lucide-react";
import { deleteUserAction } from "@/app/(app)/usuarios/actions";
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

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    start(async () => {
      const result = await deleteUserAction(userId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={pending} />}>
          <Trash2 className="h-4 w-4" />
          {pending ? "Eliminando…" : "Eliminar usuario"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {userName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El usuario perderá acceso a la plataforma de inmediato;
              sus cortes, movimientos y documentos ya registrados se conservan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && (
        <p className="mt-2 flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
}
