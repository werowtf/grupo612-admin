"use client";

import { useActionState, useState } from "react";
import { Save, AlertCircle } from "lucide-react";
import { createUserAction, updateUserAction, type UserFormState } from "@/app/(app)/usuarios/actions";
import { roleLabels } from "@/lib/labels";
import type { UserRole } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR", "CONTADOR_EXTERNO", "COMPRAS", "CAJERO"];

interface Props {
  venues: { id: string; name: string }[];
  mode: "create" | "edit";
  userId?: string;
  initial?: {
    name: string;
    email?: string;
    role: UserRole;
    active?: boolean;
    venueIds: string[];
  };
}

const initState: UserFormState = {};

export function UserForm({ venues, mode, userId, initial }: Props) {
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction, pending] = useActionState(action, initState);
  const [role, setRole] = useState<UserRole>(initial?.role ?? "CAJERO");
  const [venueIds, setVenueIds] = useState<Set<string>>(new Set(initial?.venueIds ?? []));

  function toggleVenue(id: string) {
    setVenueIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {userId && <input type="hidden" name="userId" value={userId} />}
      {venueIds.size === 0 && role === "ADMIN" && (
        // Asegura que el formulario envíe al menos el campo, aunque vacío, para ADMIN.
        <input type="hidden" name="venueIds" value="" />
      )}

      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Nombre</label>
          <Input id="name" name="name" required defaultValue={initial?.name} />
        </div>

        {mode === "create" ? (
          <div>
            <label className="label" htmlFor="email">Correo</label>
            <Input id="email" name="email" type="email" required />
          </div>
        ) : (
          <div>
            <label className="label">Correo</label>
            <Input value={initial?.email} disabled />
          </div>
        )}

        <div>
          <label className="label" htmlFor="role">Rol</label>
          <Select name="role" value={role} onValueChange={(v) => setRole(v as UserRole)}>
            <SelectTrigger
              id="role"
              className="h-8 w-full border-input bg-transparent font-normal text-foreground hover:bg-muted/50"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "create" && (
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <Input id="password" name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
          </div>
        )}

        {mode === "edit" && (
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="active" defaultChecked={initial?.active} className="h-4 w-4 rounded border-border" />
              Usuario activo
            </label>
          </div>
        )}
      </div>

      {role !== "ADMIN" && (
        <div className="card p-5">
          <label className="label">Negocios con acceso</label>
          <div className="grid gap-2 sm:grid-cols-2">
            {venues.map((v) => (
              <label key={v.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  name="venueIds"
                  value={v.id}
                  checked={venueIds.has(v.id)}
                  onChange={() => toggleVenue(v.id)}
                  className="h-4 w-4 rounded border-border"
                />
                {v.name}
              </label>
            ))}
          </div>
        </div>
      )}
      {role === "ADMIN" && (
        <p className="text-xs text-muted-foreground">
          El rol Administrador tiene acceso a todos los negocios automáticamente.
        </p>
      )}

      {state.error && (
        <p className="flex items-center gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4" />
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Guardando…" : mode === "create" ? "Crear usuario" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
