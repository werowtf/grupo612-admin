import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet, X, Tags } from "lucide-react";
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
import { RegistrarVentaButton } from "@/components/registrar-venta-button";
import { MonthPicker } from "@/components/month-picker";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";
import type { EntryType } from "@/generated/prisma/enums";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_TRIGGER_CLASS =
  "h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

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

  const filters: EntryFilters = {
    year,
    month,
    type: sp.type === "INGRESO" || sp.type === "EGRESO" ? (sp.type as EntryType) : undefined,
    category: sp.category && sp.category !== "todas" ? sp.category.trim() || undefined : undefined,
    search: sp.search?.trim() || undefined,
    take: 300,
  };
  const now = new Date();
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;
  const hasFilters = Boolean(filters.type || filters.category || filters.search || !isCurrentMonth);

  const [summary, { rows, total }, categories, { rows: dailySales }] = await Promise.all([
    getEntrySummary(selected.id, year, month),
    getVenueEntries(selected.id, filters),
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

  // El filtro ofrece los conceptos del negocio, sin repetir los que existen en
  // ingresos y egresos a la vez.
  const allCategories = [...new Set([...categories.EGRESO, ...categories.INGRESO])];

  // El catálogo lo administran quienes llevan la operación y la contabilidad.
  const puedeEditarConceptos = ["ADMIN", "GERENTE", "CONTADOR"].includes(user.role);

  return (
    <DailySaleDialogProvider>
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Ingresos y egresos</h1>
          <p className="text-sm text-muted-foreground">
            Registra y consulta los movimientos internos de caja
          </p>
        </div>
        <div className="flex gap-2">
          {puedeEditarConceptos && (
            <Link
              href="/ingresos-egresos/conceptos"
              className={buttonVariants({ variant: "outline" })}
            >
              <Tags className="h-4 w-4" />
              Conceptos
            </Link>
          )}
          <RegistrarVentaButton />
          <Link href="/ingresos-egresos/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo movimiento
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMXN(summary.ingresos)} tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Egresos" value={formatMXN(summary.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Neto" value={formatMXN(summary.neto)} tone={summary.neto >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} />
      </section>

      <form method="get" className="space-y-3">
        <div>
          <label className="label">Mes</label>
          <MonthPicker name="mes" defaultValue={mesValue} />
        </div>

        <div className="card flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[160px] flex-1">
            <label className="label" htmlFor="search">Buscar</label>
            <Input id="search" name="search" defaultValue={filters.search ?? ""} placeholder="Proveedor, folio…" />
          </div>
          <div>
            <label className="label" htmlFor="type">Tipo</label>
            <Select name="type" defaultValue={filters.type ?? "todos"}>
              <SelectTrigger id="type" className={FILTER_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="EGRESO">Egresos</SelectItem>
                <SelectItem value="INGRESO">Ingresos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="label" htmlFor="category">Categoría</label>
            <Select name="category" defaultValue={filters.category ?? "todas"}>
              <SelectTrigger id="category" className={FILTER_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {allCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Filtrar</Button>
            {hasFilters && (
              <Link href="/ingresos-egresos" className={buttonVariants({ variant: "outline" })}>
                <X className="h-4 w-4" /> Limpiar
              </Link>
            )}
          </div>
        </div>
      </form>

      {/* La venta diaria se captura con el mismo desglose que usa la
          contadora (efectivo/tarjeta/crédito + comida/bebida), un renglón
          por día, así que vive aparte de los movimientos genéricos. Usa el
          mismo mes que el filtro de arriba. */}
      <section className="space-y-2">
        <DailySalesManager venueId={selected.id} rows={saleRows} />
      </section>

      <div className="text-sm text-muted-foreground">
        {total} movimiento{total === 1 ? "" : "s"}{hasFilters ? " (filtrados)" : ""}
      </div>

      {/* Ingresos y egresos tienen columnas distintas (proveedor no aplica a
          un ingreso, por ejemplo), así que van en tablas separadas. */}
      {filters.type !== "EGRESO" && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Otros ingresos</h2>
          <EntriesTable
            type="INGRESO"
            rows={rows.filter((r) => r.type === "INGRESO")}
            hrefBase="/ingresos-egresos"
            emptyText="No hay ingresos que coincidan."
          />
        </section>
      )}

      {filters.type !== "INGRESO" && (
        <section className="space-y-2">
          <h2 className="text-base font-semibold">Egresos</h2>
          <EntriesTable
            type="EGRESO"
            rows={rows.filter((r) => r.type === "EGRESO")}
            hrefBase="/ingresos-egresos"
            emptyText="No hay egresos que coincidan."
          />
        </section>
      )}
    </div>
    </DailySaleDialogProvider>
  );
}
