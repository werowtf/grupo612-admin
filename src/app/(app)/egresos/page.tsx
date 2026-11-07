import { cache, Suspense } from "react";
import Link from "next/link";
import { Plus, TrendingDown, Tags } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getEntrySummary, getVenueEntries, getVenueCategories, type EntryFilters } from "@/lib/entries/queries";
import { EntriesTable } from "@/components/entries-table";
import { EgresosFilters } from "@/components/entry-type-filters";
import { FormMonthPicker } from "@/components/form-month-picker";
import { EgresosStatsSkeleton, EgresosTableSkeleton } from "@/components/page-skeletons";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

interface Query {
  venueId: string;
  year: number;
  month: number;
  search: string;
  category: string;
}

/** Datos de la página; con `cache`, la tarjeta y la tabla comparten una sola consulta por petición. */
const loadEgresos = cache(async (venueId: string, year: number, month: number, search: string, category: string) => {
  const filters: EntryFilters = {
    year,
    month,
    type: "EGRESO",
    category: category || undefined,
    search: search || undefined,
    take: 300,
  };
  const [summary, egresos, categories] = await Promise.all([
    getEntrySummary(venueId, year, month),
    getVenueEntries(venueId, filters),
    getVenueCategories(venueId),
  ]);
  return { summary, egresos, categories, filters };
});

async function EgresosStats(q: Query) {
  const { summary } = await loadEgresos(q.venueId, q.year, q.month, q.search, q.category);
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Egresos" value={formatMXN(summary.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
    </section>
  );
}

async function EgresosTable(q: Query) {
  const { egresos, categories, filters } = await loadEgresos(q.venueId, q.year, q.month, q.search, q.category);
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">
        Egresos <span className="text-sm font-normal text-muted-foreground">· {egresos.total}</span>
      </h2>
      <EgresosFilters
        categories={categories.EGRESO}
        defaultSearch={filters.search ?? ""}
        defaultCategory={filters.category ?? "todas"}
      />
      <EntriesTable
        type="EGRESO"
        rows={egresos.rows}
        hrefBase="/ingresos-egresos"
        emptyText="No hay egresos que coincidan."
      />
    </section>
  );
}

export default async function EgresosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user, selected } = await getAppContext();
  const sp = await searchParams;

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;
  const q: Query = {
    venueId: selected.id,
    year,
    month,
    search: sp.egr_search?.trim() ?? "",
    category: sp.egr_category && sp.egr_category !== "todas" ? sp.egr_category.trim() : "",
  };

  // El catálogo lo administran quienes llevan la operación y la contabilidad.
  const puedeEditarConceptos = ["ADMIN", "GERENTE", "CONTADOR"].includes(user.role);

  // key = mes: al cambiar de mes se muestra el esqueleto mientras llegan los datos nuevos
  // (los filtros de búsqueda y categoría actualizan sin esqueleto, para no perder el foco).
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl">Egresos</h1>
          <p className="text-sm text-muted-foreground">Gastos y salidas de dinero del negocio</p>
        </div>
        <div className="flex justify-end gap-2">
          {puedeEditarConceptos && (
            <Link href="/ingresos-egresos/conceptos" className={buttonVariants({ variant: "outline" })}>
              <Tags className="h-4 w-4" />
              Conceptos
            </Link>
          )}
          <Link href="/ingresos-egresos/nuevo?tipo=EGRESO" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo egreso
          </Link>
        </div>
      </header>

      <Suspense key={`tarjetas-${mesValue}`} fallback={<EgresosStatsSkeleton />}>
        <EgresosStats {...q} />
      </Suspense>

      <div>
        <label className="label">Mes</label>
        <FormMonthPicker name="mes" defaultValue={mesValue} />
      </div>

      <Suspense key={`tabla-${mesValue}`} fallback={<EgresosTableSkeleton />}>
        <EgresosTable {...q} />
      </Suspense>
    </div>
  );
}
