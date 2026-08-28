"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, AlertCircle, EyeOff, Eye } from "lucide-react";
import {
  createCategoryAction,
  renameCategoryAction,
  toggleCategoryAction,
  deleteCategoryAction,
  type CategoryActionState,
} from "@/app/(app)/ingresos-egresos/conceptos/actions";
import type { EntryType } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface CategoryRow {
  id: string;
  name: string;
  active: boolean;
  /** Movimientos que ya usan este concepto. */
  usos: number;
}

const init: CategoryActionState = {};

export function EntryCategoriesManager({
  venueId,
  type,
  title,
  hint,
  rows,
}: {
  venueId: string;
  type: EntryType;
  title: string;
  hint: string;
  rows: CategoryRow[];
}) {
  const router = useRouter();
  const [createState, createAction, creating] = useActionState(createCategoryAction, init);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const finishRename = useCallback(() => {
    setEditingId(null);
    router.refresh();
  }, [router]);

  function run(fn: () => Promise<CategoryActionState>) {
    setRowError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setRowError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="card min-w-0 space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>

      <form action={createAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="type" value={type} />
        <div className="min-w-[180px] flex-1">
          <label className="label font-semibold" htmlFor={`nuevo-${type}`}>
            Nuevo concepto
          </label>
          <Input id={`nuevo-${type}`} name="name" placeholder="Ej. Eventos" maxLength={60} required />
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
          <li className="px-3 py-4 text-sm text-muted-foreground">Sin conceptos todavía.</li>
        )}
        {rows.map((c) =>
          editingId === c.id ? (
            <li key={c.id} className="px-3 py-2">
              <RenameRow row={c} onDone={finishRename} onCancel={() => setEditingId(null)} />
            </li>
          ) : (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className={cn("font-semibold", !c.active && "text-muted-foreground line-through")}>
                  {c.name}
                </span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {c.usos === 0
                    ? "sin movimientos"
                    : `${c.usos} movimiento${c.usos === 1 ? "" : "s"}`}
                  {!c.active && " · desactivado"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon-sm" title="Renombrar" onClick={() => setEditingId(c.id)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title={c.active ? "Desactivar" : "Activar"}
                  onClick={() => run(() => toggleCategoryAction(c.id))}
                >
                  {c.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                {c.usos === 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Borrar"
                    onClick={() => run(() => deleteCategoryAction(c.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-danger" />
                  </Button>
                )}
              </div>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function RenameRow({
  row,
  onDone,
  onCancel,
}: {
  row: CategoryRow;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, action, saving] = useActionState(renameCategoryAction, init);

  // Cerrar la edición es un efecto de haber guardado, no algo que pueda
  // hacerse durante el render: llamar a onDone() ahí actualiza el componente
  // padre en pleno render y React aborta el árbol.
  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ok, onDone]);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={row.id} />
      <Input name="name" defaultValue={row.name} maxLength={60} required className="min-w-[160px] flex-1" autoFocus />
      <Button type="submit" size="sm" disabled={saving}>
        <Check className="h-3.5 w-3.5" />
        {saving ? "Guardando…" : "Guardar"}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
        Cancelar
      </Button>
      {state.error && <span className="w-full text-xs text-danger">{state.error}</span>}
      {row.usos > 0 && !state.error && (
        <span className="w-full text-xs text-muted-foreground">
          Se actualizarán también los {row.usos} movimiento{row.usos === 1 ? "" : "s"} que ya usan este concepto.
        </span>
      )}
    </form>
  );
}
