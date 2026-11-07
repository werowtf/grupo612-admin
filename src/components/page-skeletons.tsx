import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Fila de tarjetas de resumen (StatCard) en esqueleto. */
export function StatCardsSkeleton({ count, className }: { count: number; className: string }) {
  return (
    <div className={cn("grid gap-4", className)} aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-36" />
        </div>
      ))}
    </div>
  );
}

/** Tabla genérica en esqueleto: encabezado y renglones con celdas. */
export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden" aria-busy="true">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          <div className="flex items-center gap-6 border-b border-border bg-table-header px-3 py-2.5">
            {Array.from({ length: cols }).map((_, i) => (
              <Skeleton key={i} className={cn("h-3", i === 0 ? "w-20" : "ml-auto w-16")} />
            ))}
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="flex items-center gap-6 px-3 py-2.5">
                {Array.from({ length: cols }).map((_, c) => (
                  <Skeleton key={c} className={cn("h-3.5", c === 0 ? "w-24" : c === 1 ? "w-32" : "ml-auto w-16")} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Barra de filtros (buscar + categoría) en esqueleto. */
export function FilterBarSkeleton() {
  return (
    <div className="card flex flex-wrap items-end gap-3 p-3" aria-busy="true">
      <div className="min-w-[180px] flex-1 space-y-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-8 w-full" />
      </div>
      <div className="min-w-[160px] space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

const SectionTitle = () => <Skeleton className="h-5 w-40" />;

// ── Ingresos ────────────────────────────────────────────────
export function IngresosStatsSkeleton() {
  return <StatCardsSkeleton count={3} className="sm:grid-cols-3" />;
}

export function IngresosTablesSkeleton() {
  return (
    <>
      <section className="space-y-2">
        <SectionTitle />
        <TableSkeleton rows={7} cols={8} />
      </section>
      <section className="space-y-2">
        <SectionTitle />
        <FilterBarSkeleton />
        <TableSkeleton rows={3} cols={6} />
      </section>
    </>
  );
}

// ── Egresos ─────────────────────────────────────────────────
export function EgresosStatsSkeleton() {
  return <StatCardsSkeleton count={1} className="sm:grid-cols-3" />;
}

export function EgresosTableSkeleton() {
  return (
    <section className="space-y-2">
      <SectionTitle />
      <FilterBarSkeleton />
      <TableSkeleton rows={9} cols={7} />
    </section>
  );
}

// ── Movimientos ─────────────────────────────────────────────
export function MovimientosStatsSkeleton() {
  return <StatCardsSkeleton count={5} className="grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" />;
}

export function MovimientosTableSkeleton() {
  return <TableSkeleton rows={10} cols={8} />;
}

/** Selector de mes (y su etiqueta) en esqueleto, para los `loading.tsx`. */
export function MonthPickerSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-8" />
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}
