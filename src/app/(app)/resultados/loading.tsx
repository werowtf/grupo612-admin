import { Skeleton } from "@/components/ui/skeleton";
import { ResultadosSkeleton } from "@/components/resultados-skeleton";

/** Se muestra al entrar a Resultados desde otra sección, mientras el servidor arma la página. */
export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Resultados</h1>
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </header>
      <ResultadosSkeleton />
    </div>
  );
}
