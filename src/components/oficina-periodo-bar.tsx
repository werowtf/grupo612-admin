"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock, Pencil, RefreshCw } from "lucide-react";
import {
  abrirOficinaPeriodoAction,
  editarOficinaPeriodoAction,
} from "@/app/(app)/oficina/caja-chica/actions";
import type { CajaChicaActionState } from "@/app/(app)/caja-chica/actions";
import { DatePicker } from "@/components/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { formatMXN } from "@/lib/utils";

export interface PeriodoOption {
  key: string;
  label: string;
}

const init: CajaChicaActionState = {};
const TRIGGER = "h-9 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

/**
 * Barra de periodos de la caja chica de Oficina: selector (vigente + anteriores, sólo
 * lectura), resumen del periodo vigente y las acciones de cerrarlo y abrir uno nuevo.
 */
export function OficinaPeriodoBar({
  options,
  selectedKey,
  vigenteKey,
  vigente,
  current,
}: {
  options: PeriodoOption[];
  selectedKey: string;
  /** Clave del periodo vigente (al elegirlo se quita el parámetro de la URL). */
  vigenteKey: string;
  /** El periodo que se está viendo es el vigente. */
  vigente: boolean;
  /** Periodo vigente con fondo fijo (null = aún no hay periodos). */
  current: { id: string; startDate: string; fondoFijo: number; notes: string | null; label: string } | null;
}) {
  const router = useRouter();

  const [openMode, setOpenMode] = useState<"abrir" | "editar" | null>(null);
  const [date, setDate] = useState("");
  const [abrirState, abrirAction, abriendo] = useActionState(abrirOficinaPeriodoAction, init);
  const [editarState, editarAction, editando] = useActionState(editarOficinaPeriodoAction, init);
  const state = openMode === "editar" ? editarState : abrirState;
  const saving = abriendo || editando;

  // El objeto de estado cambia en cada resultado: cierra y refresca también en guardados consecutivos.
  useEffect(() => {
    if (abrirState.ok || editarState.ok) {
      // En una transición: responde al resultado de la acción del servidor sin encadenar un renderizado síncrono.
      startTransition(() => {
        setOpenMode(null);
        router.refresh();
      });
    }
  }, [abrirState, editarState, router]);

  function open(mode: "abrir" | "editar") {
    setDate(mode === "editar" && current ? current.startDate : "");
    setOpenMode(mode);
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[240px]">
          <label className="label" htmlFor="periodo">Periodo</label>
          <Select
            value={selectedKey}
            onValueChange={(k) => router.push(k === vigenteKey ? "/oficina/caja-chica" : `/oficina/caja-chica?periodo=${k}`)}
          >
            <SelectTrigger id="periodo" className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vigente ? (
          <div className="flex flex-wrap gap-2">
            {current && (
              <Button type="button" variant="outline" size="sm" onClick={() => open("editar")}>
                <Pencil className="h-3.5 w-3.5" />
                Editar periodo
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => open("abrir")}>
              <RefreshCw className="h-3.5 w-3.5" />
              {current ? "Cerrar periodo y abrir uno nuevo" : "Iniciar periodo con fondo fijo"}
            </Button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            Periodo cerrado · solo lectura
          </span>
        )}
      </div>

      {vigente && (
        <p className="text-xs text-muted-foreground">
          {current ? (
            <>
              Fondo fijo autorizado de <span className="font-semibold text-foreground">{formatMXN(current.fondoFijo)}</span>
              {" · "}
              {current.label}
              {current.notes ? ` · ${current.notes}` : ""}
            </>
          ) : (
            "Todavía no hay periodos: se muestra todo el historial. Inicia un periodo para ver solo el fondo fijo vigente y sus gastos."
          )}
        </p>
      )}

      <Dialog open={openMode !== null} onOpenChange={(o) => !o && !saving && setOpenMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {openMode === "editar" ? "Editar periodo vigente" : current ? "Cerrar periodo y abrir uno nuevo" : "Iniciar periodo"}
            </DialogTitle>
            {openMode === "abrir" && (
              <DialogDescription>
                {current
                  ? "El periodo actual se cierra el día anterior a la fecha de inicio. Sus fondos y gastos dejan de verse en la vista vigente (se consultan en el selector de periodo)."
                  : "Lo anterior a la fecha de inicio queda como periodo anterior, y la vista vigente muestra solo el fondo fijo y sus gastos."}
              </DialogDescription>
            )}
          </DialogHeader>
          <form key={openMode ?? "cerrado"} action={openMode === "editar" ? editarAction : abrirAction} className="space-y-3">
            {openMode === "editar" && current && <input type="hidden" name="id" value={current.id} />}
            <div>
              <label className="label font-semibold" htmlFor="periodo-date">Fecha de inicio</label>
              <DatePicker id="periodo-date" name="date" value={date} onChange={setDate} required />
            </div>
            <div>
              <label className="label font-semibold" htmlFor="periodo-fondo">Fondo fijo autorizado</label>
              <Input
                id="periodo-fondo"
                name="fondoFijo"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="12000"
                defaultValue={openMode === "editar" ? current?.fondoFijo : ""}
                required
              />
            </div>
            <div>
              <label className="label font-semibold" htmlFor="periodo-notes">Notas (opcional)</label>
              <Input
                id="periodo-notes"
                name="notes"
                maxLength={160}
                placeholder="Ej. Entregado por …"
                defaultValue={openMode === "editar" ? (current?.notes ?? "") : ""}
              />
            </div>
            {state.error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {state.error}
              </p>
            )}
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" disabled={saving} />}>Cancelar</DialogClose>
              <Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
