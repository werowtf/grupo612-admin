"use client";

import { useEffect } from "react";

/** Registra el service worker mínimo que hace la app instalable como PWA. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silencioso: no tener PWA instalable no debe romper la app normal.
      });
    }
  }, []);

  return null;
}
