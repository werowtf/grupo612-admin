import { Skeleton } from "@/components/ui/skeleton";
import { EgresosStatsSkeleton, EgresosTableSkeleton, MonthPickerSkeleton } from "@/components/page-skeletons";

/** Se muestra al entrar a Egresos desde otra sección, mientras el servidor arma la página. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl">Egresos</h1>
          <p className="text-sm text-muted-foreground">Gastos y salidas de dinero del negocio</p>
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </header>
      <EgresosStatsSkeleton />
      <MonthPickerSkeleton />
      <EgresosTableSkeleton />
    </div>
  );
}
