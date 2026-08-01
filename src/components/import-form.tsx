"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import {
  importStatementAction,
  type ImportResult,
} from "@/app/(app)/conciliacion/actions";
import { bankLabels } from "@/lib/labels";
import { formatMXN } from "@/lib/utils";
import type { Bank } from "@/generated/prisma/enums";

interface AccountOption {
  id: string;
  alias: string;
  bank: Bank;
}

const initial: ImportResult = {};

export function ImportForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(importStatementAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && (state.imported ?? 0) > 0) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  if (accounts.length === 0) {
    return (
      <div className="card p-6 text-sm text-[var(--color-muted)]">
        Este negocio no tiene cuentas bancarias configuradas.
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Importar estado de cuenta</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Sube el archivo del banco (CSV de Santander o Excel de BanBajío). Los
          movimientos se clasifican automáticamente y se omiten duplicados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bankAccountId">
            Cuenta bancaria
          </label>
          <select id="bankAccountId" name="bankAccountId" required className="input">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.alias} · {bankLabels[a.bank]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="file">
            Archivo
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            required
            className="input file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
          />
        </div>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 rounded-lg bg-[var(--color-danger-bg)] px-3 py-2 text-sm text-[var(--color-danger)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      {state.ok && (state.imported ?? 0) > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Se importaron <strong>{state.imported}</strong> movimientos
            {state.duplicates ? ` (${state.duplicates} duplicados omitidos)` : ""}.
            {state.totalAbonos != null && (
              <>
                {" "}
                Abonos {formatMXN(state.totalAbonos)} · Cargos{" "}
                {formatMXN(state.totalCargos ?? 0)}.
              </>
            )}
          </span>
        </div>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        <UploadCloud className="h-4 w-4" />
        {pending ? "Procesando…" : "Importar"}
      </button>
    </form>
  );
}
