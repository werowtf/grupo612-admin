"use client";

import { createContext, useCallback, useContext, useEffect, useRef } from "react";

type SaveFn = () => Promise<void>;

interface PedidosSaveContextValue {
  /** La vista actual registra aquí su función de guardado (o null si no hay nada que guardar). */
  register: (fn: SaveFn | null) => void;
  /** Llamado por la barra de pestañas antes de navegar a otro café/sección. */
  saveBeforeNavigate: () => Promise<void>;
}

const PedidosSaveContext = createContext<PedidosSaveContextValue | null>(null);

export function PedidosSaveProvider({ children }: { children: React.ReactNode }) {
  const saveRef = useRef<SaveFn | null>(null);

  const register = useCallback((fn: SaveFn | null) => {
    saveRef.current = fn;
  }, []);

  const saveBeforeNavigate = useCallback(async () => {
    if (saveRef.current) {
      try {
        await saveRef.current();
      } catch {
        // Si el guardado automático falla, no bloqueamos la navegación: el
        // usuario ya vio el error inline antes de intentar cambiar de vista.
      }
    }
  }, []);

  return (
    <PedidosSaveContext.Provider value={{ register, saveBeforeNavigate }}>{children}</PedidosSaveContext.Provider>
  );
}

export function usePedidosSaveRegistration(fn: SaveFn | null) {
  const ctx = useContext(PedidosSaveContext);
  if (!ctx) throw new Error("usePedidosSaveRegistration debe usarse dentro de PedidosSaveProvider");
  useEffect(() => {
    ctx.register(fn);
    return () => ctx.register(null);
  }, [ctx, fn]);
}

export function usePedidosSaveBeforeNavigate() {
  const ctx = useContext(PedidosSaveContext);
  if (!ctx) throw new Error("usePedidosSaveBeforeNavigate debe usarse dentro de PedidosSaveProvider");
  return ctx.saveBeforeNavigate;
}
