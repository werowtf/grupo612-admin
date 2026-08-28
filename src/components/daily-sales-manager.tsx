"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import {
  saveDailySaleAction,
  deleteDailySaleAction,
  type DailySaleActionState,
} from "@/app/(app)/ingresos-egresos/venta-diaria/actions";
import { formatMXN } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export interface DailySaleRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  efectivo: number;
  tarjeta: number;
  credito: number;
  statusCredito: string | null;
  comida: number;
  bebida: number;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function diaDeSemana(iso: string): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return DIAS[d.getUTCDay()];
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

const init: DailySaleActionState = {};

export function DailySalesManager({ venueId, rows }: { venueId: string; rows: DailySaleRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailySaleRow | null>(null);
  const [state, action, saving] = useActionState(saveDailySaleAction, init);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  function openNew() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(row: DailySaleRow) {
    setEditing(row);
    setOpen(true);
  }
  async function onDelete(id: string) {
    setDeleting(id);
    await deleteDailySaleAction(id);
    setDeleting(null);
    router.refresh();
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.efectivo += r.efectivo;
      acc.tarjeta += r.tarjeta;
      acc.credito += r.credito;
      acc.comida += r.comida;
      acc.bebida += r.bebida;
      return acc;
    },
    { efectivo: 0, tarjeta: 0, credito: 0, comida: 0, bebida: 0 },
  );
  const totalGeneral = totals.efectivo + totals.tarjeta + totals.credito;
  const totalSinImp = totals.comida + totals.bebida;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Venta diaria</h2>
        <Button type="button" size="sm" onClick={openNew}>
          <Plus className="h-4 w-4" />
          Registrar venta
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted-foreground">
          No hay ventas capturadas este mes.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Día</th>
                  <th className="px-3 py-2 text-right font-semibold">Efectivo</th>
                  <th className="px-3 py-2 text-right font-semibold">Tarjeta</th>
                  <th className="px-3 py-2 text-right font-semibold">Crédito</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                  <th className="px-3 py-2 font-semibold">Status crédito</th>
                  <th className="px-3 py-2 text-right font-semibold">$ Comida</th>
                  <th className="px-3 py-2 text-right font-semibold">$ Bebida</th>
                  <th className="px-3 py-2 text-right font-semibold">% Comida</th>
                  <th className="px-3 py-2 text-right font-semibold">% Bebida</th>
                  <th className="px-3 py-2 text-right font-semibold">Total sin imp.</th>
                  <th className="px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const total = r.efectivo + r.tarjeta + r.credito;
                  const sinImp = r.comida + r.bebida;
                  return (
                    <tr key={r.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold">
                        {new Date(`${r.date}T00:00:00.000Z`).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" })}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{diaDeSemana(r.date)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.efectivo)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.tarjeta)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.credito)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMXN(total)}</td>
                      <td className="max-w-[160px] truncate px-3 py-2 text-muted-foreground" title={r.statusCredito ?? ""}>
                        {r.statusCredito || "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.comida)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.bebida)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.comida, sinImp)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.bebida, sinImp)}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMXN(sinImp)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(r)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Borrar"
                            disabled={deleting === r.id}
                            onClick={() => onDelete(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-table-header/60 font-semibold">
                  <td colSpan={2} className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totals.efectivo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totals.tarjeta)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totals.credito)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totalGeneral)}</td>
                  <td></td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totals.comida)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totals.bebida)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(totals.comida, totalSinImp)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(totals.bebida, totalSinImp)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totalSinImp)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar venta del día" : "Registrar venta del día"}</DialogTitle>
          </DialogHeader>
          <form action={action} className="space-y-3">
            <input type="hidden" name="venueId" value={venueId} />
            <div>
              <label className="label font-semibold" htmlFor="date">Fecha</label>
              <Input id="date" name="date" type="date" defaultValue={editing?.date} required readOnly={!!editing} />
              {editing && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Para cambiar la fecha, borra este registro y captúralo de nuevo.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label font-semibold" htmlFor="efectivo">Efectivo</label>
                <Input id="efectivo" name="efectivo" type="number" step="0.01" min="0" defaultValue={editing?.efectivo ?? 0} />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="tarjeta">Tarjeta</label>
                <Input id="tarjeta" name="tarjeta" type="number" step="0.01" min="0" defaultValue={editing?.tarjeta ?? 0} />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="credito">Crédito</label>
                <Input id="credito" name="credito" type="number" step="0.01" min="0" defaultValue={editing?.credito ?? 0} />
              </div>
            </div>
            <div>
              <label className="label font-semibold" htmlFor="statusCredito">Status crédito</label>
              <Input id="statusCredito" name="statusCredito" placeholder="Ej. 300 DJ, 150 cortesías" defaultValue={editing?.statusCredito ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold" htmlFor="comida">$ Comida (sin imp.)</label>
                <Input id="comida" name="comida" type="number" step="0.01" min="0" defaultValue={editing?.comida ?? 0} />
              </div>
              <div>
                <label className="label font-semibold" htmlFor="bebida">$ Bebida (sin imp.)</label>
                <Input id="bebida" name="bebida" type="number" step="0.01" min="0" defaultValue={editing?.bebida ?? 0} />
              </div>
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
  );
}
