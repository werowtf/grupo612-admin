"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, AlertCircle, Wallet, HandCoins, PiggyBank } from "lucide-react";
import {
  saveFondoAction,
  deleteFondoAction,
  saveGastoAction,
  deleteGastoAction,
  type CajaChicaActionState,
} from "@/app/(app)/caja-chica/actions";
import { formatMXN, formatDate } from "@/lib/utils";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export interface FondoRow {
  id: string;
  date: string;
  amount: number;
  notes: string | null;
}

export interface GastoRow {
  id: string;
  date: string;
  amount: number;
  category: string;
  employee: string;
  description: string | null;
}

const init: CajaChicaActionState = {};

export function CajaChicaManager({
  venueId,
  resumen,
  fondos,
  gastos,
  categories,
}: {
  venueId: string;
  resumen: { fondoTotal: number; gastadoTotal: number; disponible: number };
  fondos: FondoRow[];
  gastos: GastoRow[];
  categories: string[];
}) {
  const router = useRouter();

  // ── Fondos ──────────────────────────────────────────────────
  const [fondoOpen, setFondoOpen] = useState(false);
  const [editingFondo, setEditingFondo] = useState<FondoRow | null>(null);
  const [fondoDate, setFondoDate] = useState("");
  const [fondoState, fondoAction, fondoSaving] = useActionState(saveFondoAction, init);
  const [deletingFondoId, setDeletingFondoId] = useState<string | null>(null);

  useEffect(() => {
    if (fondoState.ok) {
      setFondoOpen(false);
      router.refresh();
    }
  }, [fondoState.ok, router]);

  function onFondoOpenChange(o: boolean) {
    setFondoOpen(o);
    if (o) {
      setEditingFondo(null);
      setFondoDate("");
    }
  }
  function onEditFondo(row: FondoRow) {
    setEditingFondo(row);
    setFondoDate(row.date);
    setFondoOpen(true);
  }
  async function onDeleteFondo(id: string) {
    setDeletingFondoId(id);
    await deleteFondoAction(id);
    setDeletingFondoId(null);
    router.refresh();
  }

  // ── Gastos ──────────────────────────────────────────────────
  const [gastoOpen, setGastoOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoRow | null>(null);
  const [gastoDate, setGastoDate] = useState("");
  const [gastoState, gastoAction, gastoSaving] = useActionState(saveGastoAction, init);
  const [deletingGastoId, setDeletingGastoId] = useState<string | null>(null);

  useEffect(() => {
    if (gastoState.ok) {
      setGastoOpen(false);
      router.refresh();
    }
  }, [gastoState.ok, router]);

  function onGastoOpenChange(o: boolean) {
    setGastoOpen(o);
    if (o) {
      setEditingGasto(null);
      setGastoDate("");
    }
  }
  function onEditGasto(row: GastoRow) {
    setEditingGasto(row);
    setGastoDate(row.date);
    setGastoOpen(true);
  }
  async function onDeleteGasto(id: string) {
    setDeletingGastoId(id);
    await deleteGastoAction(id);
    setDeletingGastoId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fondo aprobado" value={formatMXN(resumen.fondoTotal)} icon={<PiggyBank className="h-4 w-4" />} />
        <StatCard label="Gastado" value={formatMXN(resumen.gastadoTotal)} tone="negative" icon={<HandCoins className="h-4 w-4" />} />
        <StatCard
          label="Disponible"
          value={formatMXN(resumen.disponible)}
          tone={resumen.disponible >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
        />
      </section>

      {/* Fondos aprobados */}
      <div className="card min-w-0 space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Fondos aprobados</h2>
          <Dialog open={fondoOpen} onOpenChange={onFondoOpenChange}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
              <Plus className="h-4 w-4" />
              Aprobar fondo
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingFondo ? "Editar fondo" : "Aprobar fondo de caja chica"}</DialogTitle>
              </DialogHeader>
              <form key={editingFondo?.id ?? "new"} action={fondoAction} className="space-y-3">
                <input type="hidden" name="venueId" value={venueId} />
                {editingFondo && <input type="hidden" name="id" value={editingFondo.id} />}
                <div>
                  <label className="label font-semibold" htmlFor="fondo-date">Fecha</label>
                  <DatePicker id="fondo-date" name="date" value={fondoDate} onChange={setFondoDate} required />
                </div>
                <div>
                  <label className="label font-semibold" htmlFor="fondo-amount">Monto</label>
                  <Input
                    id="fondo-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editingFondo?.amount ?? ""}
                    required
                  />
                </div>
                <div>
                  <label className="label font-semibold" htmlFor="fondo-notes">Notas (opcional)</label>
                  <Input
                    id="fondo-notes"
                    name="notes"
                    placeholder="Ej. Reposición de fondo"
                    maxLength={160}
                    defaultValue={editingFondo?.notes ?? ""}
                  />
                </div>
                {!editingFondo && (
                  <p className="text-xs text-muted-foreground">
                    Se creará un Egreso por este monto en Ingresos y egresos (categoría &ldquo;Caja chica&rdquo;).
                  </p>
                )}
                {fondoState.error && (
                  <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {fondoState.error}
                  </p>
                )}
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                  <Button type="submit" disabled={fondoSaving}>{fondoSaving ? "Guardando…" : "Guardar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {fondos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay fondos aprobados todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Notas</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                  <th className="px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {fondos.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/60">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(f.date)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{f.notes ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-abono">{formatMXN(f.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => onEditFondo(f)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button type="button" variant="ghost" size="icon-sm" title="Eliminar" disabled={deletingFondoId === f.id} />
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar este fondo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {formatMXN(f.amount)} del {formatDate(f.date)}. También se eliminará el egreso
                                relacionado en Ingresos y egresos. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => onDeleteFondo(f.id)}>
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
            </table>
          </div>
        )}
      </div>

      {/* Gastos */}
      <div className="card min-w-0 space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Gastos</h2>
          <Dialog open={gastoOpen} onOpenChange={onGastoOpenChange}>
            <DialogTrigger render={<Button type="button" size="sm" />}>
              <Plus className="h-4 w-4" />
              Registrar gasto
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{editingGasto ? "Editar gasto" : "Nuevo gasto de caja chica"}</DialogTitle>
              </DialogHeader>
              <form key={editingGasto?.id ?? "new"} action={gastoAction} className="space-y-3">
                <input type="hidden" name="venueId" value={venueId} />
                {editingGasto && <input type="hidden" name="id" value={editingGasto.id} />}
                <div>
                  <label className="label font-semibold" htmlFor="gasto-date">Fecha</label>
                  <DatePicker id="gasto-date" name="date" value={gastoDate} onChange={setGastoDate} required />
                </div>
                <div>
                  <label className="label font-semibold" htmlFor="gasto-employee">Quién lo tomó</label>
                  <Input
                    id="gasto-employee"
                    name="employee"
                    placeholder="Ej. Juan Pérez"
                    maxLength={120}
                    defaultValue={editingGasto?.employee ?? ""}
                    required
                  />
                </div>
                <div>
                  <label className="label font-semibold" htmlFor="gasto-category">Categoría</label>
                  <Select name="category" defaultValue={editingGasto?.category ?? categories[0]}>
                    <SelectTrigger id="gasto-category" className={FIELD_TRIGGER_CLASS}>
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
                  <label className="label font-semibold" htmlFor="gasto-amount">Monto</label>
                  <Input
                    id="gasto-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={editingGasto?.amount ?? ""}
                    required
                  />
                </div>
                <div>
                  <label className="label font-semibold" htmlFor="gasto-description">Descripción (opcional)</label>
                  <Textarea
                    id="gasto-description"
                    name="description"
                    rows={2}
                    defaultValue={editingGasto?.description ?? ""}
                  />
                </div>
                {gastoState.error && (
                  <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {gastoState.error}
                  </p>
                )}
                <DialogFooter>
                  <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
                  <Button type="submit" disabled={gastoSaving}>{gastoSaving ? "Guardando…" : "Guardar"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {gastos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay gastos registrados todavía.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Quién</th>
                  <th className="px-3 py-2 font-semibold">Categoría</th>
                  <th className="px-3 py-2 font-semibold">Descripción</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                  <th className="px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gastos.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/60">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(g.date)}</td>
                    <td className="px-3 py-2">{g.employee}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.category}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(g.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => onEditGasto(g)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button type="button" variant="ghost" size="icon-sm" title="Eliminar" disabled={deletingGastoId === g.id} />
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-danger" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {g.employee} — {formatMXN(g.amount)}. Esta acción no se puede deshacer.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction variant="destructive" onClick={() => onDeleteGasto(g.id)}>
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
