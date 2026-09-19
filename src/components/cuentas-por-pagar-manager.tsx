"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Check, AlertCircle, Pencil, Trash2 } from "lucide-react";
import {
  createCuentaPorPagarAction,
  markCuentaPagadaAction,
  deleteCuentaPorPagarAction,
  type CuentaPorPagarActionState,
} from "@/app/(app)/por-pagar/actions";
import { formatMXN, formatDate } from "@/lib/utils";
import { PAYMENT_METHODS, paymentLabels } from "@/lib/entries/config";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
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

const FIELD_TRIGGER_CLASS = "h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

export interface CuentaPorPagarRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  concept: string;
  amount: number;
  supplier: string | null;
  paymentMethod: PaymentMethod | null;
}

const init: CuentaPorPagarActionState = {};
const ALL = "__all__";
const NONE = "__none__";

export function CuentasPorPagarManager({
  venueId,
  rows,
  categories,
}: {
  venueId: string;
  rows: CuentaPorPagarRow[];
  categories: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CuentaPorPagarRow | null>(null);
  const [date, setDate] = useState("");
  const [state, action, saving] = useActionState(createCuentaPorPagarAction, init);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState(ALL);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setEditing(null);
      setDate("");
    }
  }

  function onEdit(row: CuentaPorPagarRow) {
    setEditing(row);
    setDate(row.date);
    setOpen(true);
  }

  async function onPagar(id: string) {
    setPayingId(id);
    setRowError(null);
    const res = await markCuentaPagadaAction(id);
    if (res.error) setRowError(res.error);
    setPayingId(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    setRowError(null);
    const res = await deleteCuentaPorPagarAction(id);
    if (res.error) setRowError(res.error);
    setDeletingId(null);
    router.refresh();
  }

  const suppliers = [...new Set(rows.map((r) => r.supplier).filter((s): s is string => !!s))].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const hasNoSupplier = rows.some((r) => !r.supplier);
  const filterValue = supplierFilter === NONE ? (hasNoSupplier ? NONE : ALL) : suppliers.includes(supplierFilter) || supplierFilter === ALL ? supplierFilter : ALL;
  const visible = rows.filter((r) =>
    filterValue === ALL ? true : filterValue === NONE ? !r.supplier : r.supplier === filterValue,
  );
  const total = visible.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="card min-w-0 space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Otros</h2>
        <div className="flex flex-wrap items-center gap-2">
        {rows.length > 0 && (
          <Select value={filterValue} onValueChange={(v) => setSupplierFilter(v ?? ALL)}>
            <SelectTrigger className="h-8 w-48 max-w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50" aria-label="Filtrar por proveedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
              {hasNoSupplier && <SelectItem value={NONE}>Sin proveedor</SelectItem>}
            </SelectContent>
          </Select>
        )}
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger render={<Button type="button" size="sm" />}>
            <Plus className="h-4 w-4" />
            Agregar
          </DialogTrigger>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar cuenta por pagar" : "Nueva cuenta por pagar"}</DialogTitle>
            </DialogHeader>
            <form key={editing?.id ?? "new"} action={action} className="space-y-3">
              <input type="hidden" name="venueId" value={venueId} />
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div>
                <label className="label font-semibold" htmlFor="date">Fecha</label>
                <DatePicker id="date" name="date" value={date} onChange={setDate} required />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="concept">Concepto</label>
                <Select name="concept" defaultValue={editing?.concept ?? categories[0]}>
                  <SelectTrigger id="concept" className={FIELD_TRIGGER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="label font-semibold" htmlFor="amount">Monto</label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={editing?.amount ?? ""}
                  required
                />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="supplier">Proveedor</label>
                <Input
                  id="supplier"
                  name="supplier"
                  placeholder="Ej. CFE"
                  maxLength={120}
                  defaultValue={editing?.supplier ?? ""}
                />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="paymentMethod">Forma de pago</label>
                <Select name="paymentMethod" defaultValue={editing?.paymentMethod ?? "EFECTIVO"}>
                  <SelectTrigger id="paymentMethod" className={FIELD_TRIGGER_CLASS}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {paymentLabels[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      </div>

      {rowError && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {rowError}
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
                <th className="px-3 py-2 font-semibold">Proveedor</th>
                <th className="px-3 py-2 font-semibold">Forma de pago</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
                <th className="px-3 py-2 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-muted/60">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(r.date)}</td>
                  <td className="px-3 py-2">{r.concept}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.supplier ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {r.paymentMethod ? paymentLabels[r.paymentMethod] : "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(r.amount)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
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
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Editar"
                        onClick={() => onEdit(r)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="Eliminar"
                              disabled={deletingId === r.id}
                            />
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-danger" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar esta cuenta por pagar?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {r.concept} — {formatMXN(r.amount)}. Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => onDelete(r.id)}>
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-table-header/60 font-semibold">
                <td colSpan={4} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  {filterValue === ALL ? "Total pendiente" : "Total pendiente (filtrado)"}
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
