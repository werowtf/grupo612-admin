"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, AlertCircle } from "lucide-react";
import {
  createCuentaPorPagarAction,
  markCuentaPagadaAction,
  type CuentaPorPagarActionState,
} from "@/app/(app)/por-pagar/actions";
import { formatMXN, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface CuentaPorPagarRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  concept: string;
  amount: number;
}

const init: CuentaPorPagarActionState = {};

export function CuentasPorPagarManager({ venueId, rows }: { venueId: string; rows: CuentaPorPagarRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, saving] = useActionState(createCuentaPorPagarAction, init);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  async function onPagar(id: string) {
    setPayingId(id);
    setPayError(null);
    const res = await markCuentaPagadaAction(id);
    if (res.error) setPayError(res.error);
    setPayingId(null);
    router.refresh();
  }

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="card min-w-0 space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Otros</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" size="sm" />}>
            <Plus className="h-4 w-4" />
            Agregar
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nueva cuenta por pagar</DialogTitle>
            </DialogHeader>
            <form action={action} className="space-y-3">
              <input type="hidden" name="venueId" value={venueId} />
              <div>
                <label className="label font-semibold" htmlFor="date">Fecha</label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="concept">Concepto</label>
                <Input id="concept" name="concept" placeholder="Ej. Renta agosto" maxLength={120} required />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="amount">Monto</label>
                <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required />
              </div>
              {state.error && (
                <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {state.error}
                </p>
              )}
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {payError && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {payError}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay cuentas pendientes.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Concepto</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
                <th className="px-3 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(r.date)}</td>
                  <td className="px-3 py-2">{r.concept}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(r.amount)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={payingId === r.id}
                      onClick={() => onPagar(r.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Pagado
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-table-header/60 font-semibold">
                <td colSpan={2} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  Total pendiente
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
