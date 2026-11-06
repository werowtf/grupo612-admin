"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { buttonVariants } from "@/components/ui/button";

/**
 * Selector de mes y descarga del PDF de Resultados. El botón usa el mes que se
 * eligió en el selector al instante, sin esperar a que la página termine de
 * recargar con el mes nuevo: así el PDF siempre es del mes que se está viendo.
 * (Se monta de nuevo con `key={mes}` cuando el servidor confirma el mes.)
 */
export function ResultadosActions({ mes }: { mes: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(mes);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <MonthPicker
        name="mes"
        defaultValue={mes}
        onChange={(v) => {
          setSelected(v);
          router.push(`/resultados?mes=${v}`);
        }}
      />
      <a href={`/api/resultados/pdf?mes=${selected}`} download className={buttonVariants({ variant: "outline" })}>
        <Download className="h-4 w-4" />
        Descargar PDF
      </a>
    </div>
  );
}
