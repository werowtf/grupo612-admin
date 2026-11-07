import { cache, Suspense } from "react";
import Link from "next/link";
import { Plus, TrendingUp, Banknote, Tags } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getEntrySummary, getVenueEntries, getVenueCategories, type EntryFilters } from "@/lib/entries/queries";
import { getDailySales } from "@/lib/daily-sales/queries";
import { EntriesTable } from "@/components/entries-table";
import { DailySalesManager, type DailySaleRow } from "@/components/daily-sales-manager";
import { DailySaleDialogProvider } from "@/components/daily-sales-context";
import { IngresosFilters } from "@/components/entry-type-filters";
import { FormMonthPicker } from "@/components/form-month-picker";
import { IngresosStatsSkeleton, IngresosTablesSkeleton } from "@/components/page-skeletons";
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

/** Datos de la página; con `cache`, las tarjetas y las tablas comparten una sola consulta por petición. */
const loadIngresos = cache(async (venueId: string, year: number, month: number, search: string, category: string) => {
  const filters: EntryFilters = {
    year,
    month,
    type: "INGRESO",
    category: category || undefined,
    search: search || undefined,
    take: 300,
  };

  const [summary, ingresos, categories, { rows: dailySales, propinas: propinasDia }] = await Promise.all([
    getEntrySummary(venueId, year, month),
    getVenueEntries(venueId, filters),
    getVenueCategories(venueId),
    getDailySales(venueId, year, month),
  ]);

  const saleRows: DailySaleRow[] = dailySales.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    source: r.source,
    efectivo: Number(r.efectivo),
    tarjeta: Number(r.tarjeta),
    credito: Number(r.credito),
    // Las propinas con tarjeta van dentro de Tarjeta; se restan para "Ventas con imp.".
    propinas: r.source === "CORTE" ? (propinasDia.get(r.date.toISOString().slice(0, 10)) ?? 0) : 0,
    statusCredito: r.statusCredito,
    comida: Number(r.comida),
    bebida: Number(r.bebida),
  }));

  // Ingresos = otros ingresos + lo cobrado en venta diaria (efectivo + tarjeta;
  // el crédito no cuenta hasta que se cobra).
  const ventaCobrada = saleRows.reduce((sum, r) => sum + r.efectivo + r.tarjeta, 0);
  return { summary, ingresos, categories, saleRows, ventaCobrada, ingresosTotal: summary.ingresos + ventaCobrada, filters };
});

async function IngresosStats(q: Query) {
  const { summary, ventaCobrada, ingresosTotal } = await loadIngresos(q.venueId, q.year, q.month, q.search, q.category);
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Venta cobrada" value={formatMXN(ventaCobrada)} hint="Efectivo + tarjeta (venta diaria)" tone="positive" icon={<Banknote className="h-4 w-4" />} />
      <StatCard label="Otros ingresos" value={formatMXN(summary.ingresos)} tone="positive" icon={<Plus className="h-4 w-4" />} />
      <StatCard label="Total ingresos" value={formatMXN(ingresosTotal)} tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
    </section>
  );
}

async function IngresosTables(q: Query) {
  const { ingresos, categories, saleRows, filters } = await loadIngresos(q.venueId, q.year, q.month, q.search, q.category);
  return (
    <>
      {/* La venta diaria se captura con el mismo desglose que usa la
          contadora (efectivo/tarjeta/crédito + comida/bebida), un renglón
          por día, así que vive aparte de los ingresos genéricos. */}
      <section className="space-y-2">
        <DailySalesManager venueId={q.venueId} rows={saleRows} />
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Otros ingresos <span className="text-sm font-normal text-muted-foreground">· {ingresos.total}</span>
        </h2>
        <IngresosFilters
          categories={categories.INGRESO}
          defaultSearch={filters.search ?? ""}
          defaultCategory={filters.category ?? "todas"}
        />
        <EntriesTable
          type="INGRESO"
          rows={ingresos.rows}
          hrefBase="/ingresos-egresos"
          emptyText="No hay ingresos que coincidan."
        />
      </section>
    </>
  );
}

export default async function IngresosPage({
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
    search: sp.ing_search?.trim() ?? "",
    category: sp.ing_category && sp.ing_category !== "todas" ? sp.ing_category.trim() : "",
  };

  // El catálogo lo administran quienes llevan la operación y la contabilidad.
  const puedeEditarConceptos = ["ADMIN", "GERENTE", "CONTADOR"].includes(user.role);

  // key = mes: al cambiar de mes se muestra el esqueleto mientras llegan los datos nuevos
  // (los filtros de búsqueda y categoría actualizan sin esqueleto, para no perder el foco).
  return (
    <DailySaleDialogProvider>
      <div className="space-y-6">
        <header className="space-y-3">
          <div>
            <h1 className="text-xl">Ingresos</h1>
            <p className="text-sm text-muted-foreground">Venta diaria y otros ingresos del negocio</p>
          </div>
          <div className="flex justify-end gap-2">
            {puedeEditarConceptos && (
              <Link href="/ingresos-egresos/conceptos" className={buttonVariants({ variant: "outline" })}>
                <Tags className="h-4 w-4" />
                Conceptos
              </Link>
            )}
            <Link href="/ingresos-egresos/nuevo?tipo=INGRESO" className={buttonVariants()}>
              <Plus className="h-4 w-4" />
              Nuevo ingreso
            </Link>
          </div>
        </header>

        <Suspense key={`tarjetas-${mesValue}`} fallback={<IngresosStatsSkeleton />}>
          <IngresosStats {...q} />
        </Suspense>

        <div>
          <label className="label">Mes</label>
          <FormMonthPicker name="mes" defaultValue={mesValue} />
        </div>

        <Suspense key={`tablas-${mesValue}`} fallback={<IngresosTablesSkeleton />}>
          <IngresosTables {...q} />
        </Suspense>
      </div>
    </DailySaleDialogProvider>
  );
}
