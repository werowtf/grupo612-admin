"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import {
  importStatementAction,
  type ImportResult,
} from "@/app/(app)/conciliacion/actions";
import { bankLabels } from "@/lib/labels";
import { formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (state.ok && (state.imported ?? 0) > 0) {
      formRef.current?.reset();
      setFileName(null);
      router.refresh();
    }
  }, [state, router]);

  const selectedAccount = accounts.find((a) => a.id === bankAccountId);

  if (accounts.length === 0) {
    return (
      <div className="card p-6 text-sm text-muted-foreground">
        Este negocio no tiene cuentas bancarias configuradas.
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold">Importar estado de cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Sube el archivo del banco (CSV de Santander o Excel de BanBajío). Los
          movimientos se clasifican automáticamente y se omiten duplicados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="bankAccountId">
            Cuenta bancaria
          </label>
          <Select name="bankAccountId" required value={bankAccountId} onValueChange={setBankAccountId}>
            <SelectTrigger
              id="bankAccountId"
              className="h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.alias} · {bankLabels[a.bank]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="label" htmlFor="file">
            Archivo
          </label>
          <Input
            id="file"
            name="file"
            type="file"
            accept=".csv,.xlsx,.xls"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            className="file:mr-2 file:h-6 file:rounded file:border-0 file:bg-brand-50 file:px-2.5 file:py-0 file:text-xs file:text-brand-600"
          />
        </div>
      </div>

      {state.error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      {state.ok && (state.imported ?? 0) > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-600">
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

      {state.ok && (state.unmatched ?? 0) > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-pending-bg px-3 py-2 text-sm text-pending">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p>
              <strong>{state.unmatched}</strong>{" "}
              {state.unmatched === 1 ? "concepto no coincidió" : "conceptos no coincidieron"} con
              ninguna regla y {state.unmatched === 1 ? "se clasificó" : "se clasificaron"} por
              defecto. Revísalos en Movimientos y corrige la categoría si hace falta.
            </p>
            <ul className="mt-1 space-y-0.5">
              {state.unmatchedSamples?.map((s) => (
                <li key={s} className="truncate text-xs opacity-80">
                  · {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              disabled={pending || !fileName}
              onClick={() => setConfirmOpen(true)}
            />
          }
        >
          <UploadCloud className="h-4 w-4" />
          {pending ? "Procesando…" : "Importar"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar a {selectedAccount?.alias ?? "esta cuenta"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a importar <strong>{fileName}</strong> a la cuenta{" "}
              <strong>{selectedAccount?.alias}</strong> ({selectedAccount ? bankLabels[selectedAccount.bank] : ""}).
              Verifica que sea el negocio correcto antes de continuar — el sistema no puede detectar
              solo si el archivo corresponde a otro negocio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                formRef.current?.requestSubmit();
              }}
            >
              Sí, importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
