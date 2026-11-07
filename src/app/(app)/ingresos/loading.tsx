import { Skeleton } from "@/components/ui/skeleton";
import { IngresosStatsSkeleton, IngresosTablesSkeleton, MonthPickerSkeleton } from "@/components/page-skeletons";

/** Se muestra al entrar a Ingresos desde otra sección, mientras el servidor arma la página. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl">Ingresos</h1>
          <p className="text-sm text-muted-foreground">Venta diaria y otros ingresos del negocio</p>
        </div>
        <div className="flex justify-end gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </header>
      <IngresosStatsSkeleton />
      <MonthPickerSkeleton />
      <IngresosTablesSkeleton />
    </div>
  );
}
