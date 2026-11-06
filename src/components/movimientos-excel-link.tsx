"use client";

import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Descarga del Excel de Movimientos. El mes se toma del selector en el momento
 * del clic (el selector cambia al instante, antes de que la página termine de
 * recargar), así el archivo siempre es del mes que se está viendo. Los demás
 * filtros son los ya aplicados (los de la tabla que se ve).
 */
export function MovimientosExcelLink({ mes, filters }: { mes: string; filters: Record<string, string> }) {
  const build = (m: string) => `/api/movimientos/export?${new URLSearchParams({ mes: m, ...filters })}`;

  return (
    <a
      href={build(mes)}
      download
      className={buttonVariants({ variant: "outline" })}
      onClick={(e) => {
        const live = document.querySelector<HTMLInputElement>('form input[name="mes"]')?.value;
        if (live && /^\d{4}-\d{2}$/.test(live)) e.currentTarget.href = build(live);
      }}
    >
      <Download className="h-4 w-4" />
      Descargar Excel
    </a>
  );
}
