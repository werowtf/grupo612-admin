"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { DailySaleRow } from "@/components/daily-sales-manager";

interface DailySaleDialogState {
  open: boolean;
  editing: DailySaleRow | null;
  openNew: () => void;
  openEdit: (row: DailySaleRow) => void;
  setOpen: (open: boolean) => void;
}

const DailySaleDialogContext = createContext<DailySaleDialogState | null>(null);

/**
 * El botón "Registrar venta" vive en el encabezado de la página, pero el
 * diálogo lo dibuja DailySalesManager más abajo — comparten este estado para
 * no forzar una sola ubicación en el árbol.
 */
export function DailySaleDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DailySaleRow | null>(null);

  const value: DailySaleDialogState = {
    open,
    editing,
    setOpen,
    openNew: () => {
      setEditing(null);
      setOpen(true);
    },
    openEdit: (row) => {
      setEditing(row);
      setOpen(true);
    },
  };

  return <DailySaleDialogContext.Provider value={value}>{children}</DailySaleDialogContext.Provider>;
}

export function useDailySaleDialog(): DailySaleDialogState {
  const ctx = useContext(DailySaleDialogContext);
  if (!ctx) throw new Error("useDailySaleDialog debe usarse dentro de DailySaleDialogProvider");
  return ctx;
}
