"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, AlertCircle, StickyNote } from "lucide-react";
import { saveNotaAction, deleteNotaAction, type NotaActionState } from "@/app/(app)/oficina/notas/actions";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

export interface NotaRow {
  id: string;
  content: string;
  authorName: string | null;
  updatedAt: string;
}

const init: NotaActionState = {};

export function OficinaNotasManager({ notas }: { notas: NotaRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<NotaRow | null>(null);
  const [state, action, saving] = useActionState(saveNotaAction, init);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, router]);

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) setEditing(null);
  }
  function onEdit(row: NotaRow) {
    setEditing(row);
    setOpen(true);
  }
  async function onDelete(id: string) {
    setDeletingId(id);
    await deleteNotaAction(id);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Bloc compartido: cualquiera con acceso a Oficina puede crear, editar o borrar notas.
        </p>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger render={<Button type="button" size="sm" />}>
            <Plus className="h-4 w-4" />
            Nueva nota
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar nota" : "Nueva nota"}</DialogTitle>
            </DialogHeader>
            <form key={editing?.id ?? "new"} action={action} className="space-y-3">
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div>
                <Textarea
                  id="content"
                  name="content"
                  rows={6}
                  autoFocus
                  placeholder="Escribe la nota…"
                  defaultValue={editing?.content ?? ""}
                  required
                />
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

      {notas.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted-foreground">
          <StickyNote className="mx-auto mb-2 h-6 w-6 text-muted-foreground/60" />
          No hay notas todavía.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {notas.map((n) => (
            <div key={n.id} className="card flex min-w-0 flex-col gap-3 p-4">
              <p className="min-w-0 whitespace-pre-wrap break-words text-sm">{n.content}</p>
              <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">
                  {n.authorName ?? "—"} · {formatDate(n.updatedAt)}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => onEdit(n)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button type="button" variant="ghost" size="icon-sm" title="Eliminar" disabled={deletingId === n.id} />
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5 text-danger" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar esta nota?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => onDelete(n.id)}>
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
