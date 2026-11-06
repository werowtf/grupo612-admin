"use client";

import { useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MonthPicker } from "@/components/month-picker";

/**
 * Selector de mes dentro de un formulario GET: al elegir un mes aplica el filtro
 * de inmediato, conservando el resto de filtros del formulario (búsqueda, tipo, etc.).
 */
export function FormMonthPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ref = useRef<HTMLDivElement>(null);

  function apply(value: string) {
    const form = ref.current?.closest("form");
    // Dentro de un formulario conserva sus campos; fuera de uno, los parámetros actuales de la URL.
    const params = form ? new URLSearchParams() : new URLSearchParams(searchParams.toString());
    if (form) {
      for (const [k, v] of new FormData(form).entries()) {
        if (typeof v === "string" && v !== "" && k !== name) params.set(k, v);
      }
    }
    params.set(name, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div ref={ref}>
      <MonthPicker name={name} defaultValue={defaultValue} onChange={apply} />
    </div>
  );
}
