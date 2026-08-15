"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleActiveAction } from "@/app/(app)/usuarios/actions";
import { cn } from "@/lib/utils";
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

export function ToggleActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onConfirm() {
    start(async () => {
      await toggleActiveAction(userId);
      router.refresh();
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={pending}
        title={active ? "Clic para desactivar" : "Clic para reactivar"}
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
          active ? "bg-success-bg text-success hover:bg-danger-bg hover:text-danger" : "bg-muted text-muted-foreground hover:bg-success-bg hover:text-success",
        )}
      >
        {pending ? "…" : active ? "Activo" : "Inactivo"}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {active ? "¿Desactivar a este usuario?" : "¿Reactivar a este usuario?"}
          </AlertDialogTitle>
          {active && (
            <AlertDialogDescription>No podrá iniciar sesión.</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {active ? "Desactivar" : "Reactivar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
