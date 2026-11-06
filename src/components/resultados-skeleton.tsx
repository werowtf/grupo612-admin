import { Skeleton } from "@/components/ui/skeleton";

// Anchos del concepto de cada renglón, variados para que se parezca a la tabla real.
const LABEL_WIDTHS = [
  "w-20", "w-28", "w-24", "w-32", "w-28", "w-20", "w-24", "w-36", "w-16", "w-28",
  "w-20", "w-24", "w-28", "w-24", "w-32", "w-20", "w-28", "w-24", "w-36", "w-28",
];

/** Esqueleto de Resultados: tarjetas de resumen y tabla del estado de resultados. */
export function ResultadosSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando resultados">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3 p-4">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
        ))}
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            <div className="flex items-center gap-3 border-b border-border bg-table-header px-3 py-2.5">
              <Skeleton className="h-3 w-20" />
              <div className="ml-auto flex gap-6">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
            </div>
            <div className="divide-y divide-border">
              {LABEL_WIDTHS.map((w, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className={`h-3.5 ${w}`} />
                  <div className="ml-auto flex gap-6">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <Skeleton key={j} className="h-3.5 w-16" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
