"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Check, X, AlertCircle, EyeOff, Eye } from "lucide-react";
import {
  createProductoAction,
  updateProductoAction,
  toggleProductoAction,
  type ProductoActionState,
} from "@/app/(app)/pedidos/productos/actions";
import { cn, formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ProductoRow {
  id: string;
  name: string;
  price: number;
  active: boolean;
}

const init: ProductoActionState = {};

export function ProductosCafeteriaManager({
  cafeteriaId,
  title,
  rows,
}: {
  cafeteriaId: string;
  title: string;
  rows: ProductoRow[];
}) {
  const router = useRouter();
  const [createState, createAction, creating] = useActionState(createProductoAction, init);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finishEdit = useCallback(() => {
    setEditingId(null);
    router.refresh();
  }, [router]);

  function run(fn: () => Promise<ProductoActionState>) {
    setRowError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setRowError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card min-w-0 space-y-4 p-5">
      <h2 className="text-base font-semibold">{title}</h2>

      <form action={createAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="cafeteriaId" value={cafeteriaId} />
        <div className="min-w-[160px] flex-1">
          <label className="label font-semibold" htmlFor={`nuevo-${cafeteriaId}`}>Nuevo producto</label>
          <Input id={`nuevo-${cafeteriaId}`} name="name" placeholder="Ej. Sándwich" maxLength={80} required />
        </div>
        <div className="w-28">
          <label className="label font-semibold" htmlFor={`precio-${cafeteriaId}`}>Precio</label>
          <Input id={`precio-${cafeteriaId}`} name="price" type="number" step="0.01" min="0.01" required />
        </div>
        <Button type="submit" disabled={creating}>
          <Plus className="h-4 w-4" />
          {creating ? "Agregando…" : "Agregar"}
        </Button>
      </form>

      {createState.error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {createState.error}
        </p>
      )}
      {rowError && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {rowError}
        </p>
      )}

      <ul className={cn("divide-y divide-border rounded-lg border border-border", pending && "opacity-60")}>
        {rows.length === 0 && (
          <li className="px-3 py-4 text-sm text-muted-foreground">Sin productos todavía.</li>
        )}
        {rows.map((p) =>
          editingId === p.id ? (
            <li key={p.id} className="px-3 py-2">
              <EditRow row={p} onDone={finishEdit} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className={cn("font-semibold", !p.active && "text-muted-foreground line-through")}>
                  {p.name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {formatMXN(p.price)}
                  {!p.active && " · desactivado"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => setEditingId(p.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={p.active ? "Desactivar" : "Activar"}
                  onClick={() => run(() => toggleProductoAction(p.id))}
                >
                  {p.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function EditRow({ row, onDone, onCancel }: { row: ProductoRow; onDone: () => void; onCancel: () => void }) {
  const [state, action, saving] = useActionState(updateProductoAction, init);

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={row.id} />
      <Input name="name" defaultValue={row.name} maxLength={80} required className="min-w-[140px] flex-1" autoFocus />
      <Input name="price" type="number" step="0.01" min="0.01" defaultValue={row.price} className="w-24" required />
      <Button type="submit" size="sm" disabled={saving}>
        <Check className="h-3.5 w-3.5" />
        {saving ? "Guardando…" : "Guardar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
        Cancelar
      </Button>
      {state.error && <span className="w-full text-xs text-danger">{state.error}</span>}
    </form>
  );
}
