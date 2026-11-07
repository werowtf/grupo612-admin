import { Skeleton } from "@/components/ui/skeleton";
import { MovimientosStatsSkeleton, MovimientosTableSkeleton } from "@/components/page-skeletons";

/** Se muestra al entrar a Movimientos desde otra sección, mientras el servidor arma la página. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Movimientos</h1>
          <Skeleton className="mt-2 h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </header>
      <MovimientosStatsSkeleton />
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 min-w-[180px] flex-1 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      <MovimientosTableSkeleton />
    </div>
  );
}
