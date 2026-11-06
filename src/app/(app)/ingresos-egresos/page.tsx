import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet, Tags } from "lucide-react";
import { getAppContext } from "@/lib/context";
import {
  getEntrySummary,
  getVenueEntries,
  getVenueCategories,
  type EntryFilters,
} from "@/lib/entries/queries";
import { getDailySales } from "@/lib/daily-sales/queries";
import { EntriesTable } from "@/components/entries-table";
import { DailySalesManager, type DailySaleRow } from "@/components/daily-sales-manager";
import { DailySaleDialogProvider } from "@/components/daily-sales-context";
import { EgresosFilters, IngresosFilters } from "@/components/entry-type-filters";
import { FormMonthPicker } from "@/components/form-month-picker";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function IngresosEgresosPage({
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

  const clean = (v: string | undefined) => (v && v !== "todas" ? v.trim() || undefined : undefined);
  const ingFilters: EntryFilters = {
    year, month, type: "INGRESO", category: clean(sp.ing_category), search: sp.ing_search?.trim() || undefined, take: 300,
  };
  const egrFilters: EntryFilters = {
    year, month, type: "EGRESO", category: clean(sp.egr_category), search: sp.egr_search?.trim() || undefined, take: 300,
  };

  const [summary, ingresos, egresos, categories, { rows: dailySales }] = await Promise.all([
    getEntrySummary(selected.id, year, month),
    getVenueEntries(selected.id, ingFilters),
    getVenueEntries(selected.id, egrFilters),
    getVenueCategories(selected.id),
    getDailySales(selected.id, year, month),
  ]);

  const saleRows: DailySaleRow[] = dailySales.map((r) => ({
    id: r.id,
    date: r.date.toISOString().slice(0, 10),
    source: r.source,
    efectivo: Number(r.efectivo),
    tarjeta: Number(r.tarjeta),
    credito: Number(r.credito),
    statusCredito: r.statusCredito,
    comida: Number(r.comida),
    bebida: Number(r.bebida),
  }));

  // Ingresos = otros ingresos + lo cobrado en venta diaria (efectivo + tarjeta;
  // el crédito no cuenta hasta que se cobra).
  const ventaCobrada = saleRows.reduce((sum, r) => sum + r.efectivo + r.tarjeta, 0);
  const ingresosTotal = summary.ingresos + ventaCobrada;
  const netoTotal = ingresosTotal - summary.egresos;

  // El catálogo lo administran quienes llevan la operación y la contabilidad.
  const puedeEditarConceptos = ["ADMIN", "GERENTE", "CONTADOR"].includes(user.role);

  return (
    <DailySaleDialogProvider>
    <div className="space-y-6">
      <header className="space-y-3">
        <div>
          <h1 className="text-xl">Ingresos y Egresos</h1>
          <p className="text-sm text-muted-foreground">
            Registra y consulta los movimientos internos de caja
          </p>
        </div>
        <div className="flex justify-end gap-2">
          {puedeEditarConceptos && (
            <Link
              href="/ingresos-egresos/conceptos"
              className={buttonVariants({ variant: "outline" })}
            >
              <Tags className="h-4 w-4" />
              Conceptos
            </Link>
          )}
          <Link href="/ingresos-egresos/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMXN(ingresosTotal)} hint="Otros ingresos + venta cobrada" tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Egresos" value={formatMXN(summary.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Neto" value={formatMXN(netoTotal)} tone={netoTotal >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} />
      </section>

      <div>
        <label className="label">Mes</label>
        <FormMonthPicker name="mes" defaultValue={mesValue} />
      </div>

      {/* La venta diaria se captura con el mismo desglose que usa la
          contadora (efectivo/tarjeta/crédito + comida/bebida), un renglón
          por día, así que vive aparte de los movimientos genéricos. Usa el
          mismo mes que el selector de arriba. */}
      <section className="space-y-2">
        <DailySalesManager venueId={selected.id} rows={saleRows} />
      </section>

      {/* Ingresos y egresos tienen columnas distintas (proveedor no aplica a
          un ingreso, por ejemplo), así que van en tablas separadas, cada una
          con sus propios filtros. */}
      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Otros ingresos <span className="text-sm font-normal text-muted-foreground">· {ingresos.total}</span>
        </h2>
        <IngresosFilters
          categories={categories.INGRESO}
          defaultSearch={ingFilters.search ?? ""}
          defaultCategory={ingFilters.category ?? "todas"}
        />
        <EntriesTable
          type="INGRESO"
          rows={ingresos.rows}
          hrefBase="/ingresos-egresos"
          emptyText="No hay ingresos que coincidan."
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">
          Egresos <span className="text-sm font-normal text-muted-foreground">· {egresos.total}</span>
        </h2>
        <EgresosFilters
          categories={categories.EGRESO}
          defaultSearch={egrFilters.search ?? ""}
          defaultCategory={egrFilters.category ?? "todas"}
        />
        <EntriesTable
          type="EGRESO"
          rows={egresos.rows}
          hrefBase="/ingresos-egresos"
          emptyText="No hay egresos que coincidan."
        />
      </section>
    </div>
    </DailySaleDialogProvider>
  );
}