"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleActiveAction } from "@/app/(app)/usuarios/actions";
import { cn } from "@/lib/utils";

export function ToggleActiveButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onClick() {
    const msg = active ? "¿Desactivar a este usuario? No podrá iniciar sesión." : "¿Reactivar a este usuario?";
    if (!confirm(msg)) return;
    start(async () => {
      await toggleActiveAction(userId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
        active ? "bg-brand-50 text-brand-700 hover:bg-rose-50 hover:text-rose-700" : "bg-gray-100 text-gray-500 hover:bg-brand-50 hover:text-brand-700",
      )}
      title={active ? "Clic para desactivar" : "Clic para reactivar"}
    >
      {pending ? "…" : active ? "Activo" : "Inactivo"}
    </button>
  );
}
