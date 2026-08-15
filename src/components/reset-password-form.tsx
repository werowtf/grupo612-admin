"use client";

import { useActionState } from "react";
import { KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";
import { resetPasswordAction, type UserFormState } from "@/app/(app)/usuarios/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const init: UserFormState = {};

export function ResetPasswordForm({ userId, justReset }: { userId: string; justReset?: boolean }) {
  const [state, action, pending] = useActionState(resetPasswordAction, init);

  return (
    <form action={action} className="card space-y-3 p-5">
      <input type="hidden" name="userId" value={userId} />
      <h2 className="text-base font-semibold">Restablecer contraseña</h2>
      <div>
        <label className="label" htmlFor="password">Nueva contraseña</label>
        <Input id="password" name="password" type="password" minLength={8} required placeholder="Mínimo 8 caracteres" />
      </div>
      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}
      {justReset && !state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-600">
          <CheckCircle2 className="h-4 w-4" />
          Contraseña actualizada.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={pending}>
        <KeyRound className="h-4 w-4" />
        {pending ? "Actualizando…" : "Restablecer"}
      </Button>
    </form>
  );
}
