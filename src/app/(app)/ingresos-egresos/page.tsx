import Link from "next/link";
import { Plus, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";
import { getAppContext } from "@/lib/context";
import {
  getEntrySummary,
  getVenueEntries,
  getVenueCategories,
  type EntryFilters,
} from "@/lib/entries/queries";
import { EntriesTable } from "@/components/entries-table";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";
import type { EntryType } from "@/generated/prisma/enums";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_TRIGGER_CLASS =
  "h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";

export default async function IngresosEgresosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { selected } = await getAppContext();
  const sp = await searchParams;

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const filters: EntryFilters = {
    type: sp.type === "INGRESO" || sp.type === "EGRESO" ? (sp.type as EntryType) : undefined,
    category: sp.category && sp.category !== "todas" ? sp.category.trim() || undefined : undefined,
    search: sp.search?.trim() || undefined,
    take: 300,
  };
  const hasFilters = Boolean(filters.type || filters.category || filters.search);

  const [summary, { rows, total }, categories] = await Promise.all([
    getEntrySummary(selected.id),
    getVenueEntries(selected.id, filters),
    getVenueCategories(selected.id),
  ]);

  // El filtro ofrece los conceptos del negocio, sin repetir los que existen en
  // ingresos y egresos a la vez.
  const allCategories = [...new Set([...categories.EGRESO, ...categories.INGRESO])];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Ingresos y egresos</h1>
          <p className="text-sm text-muted-foreground">
            Registra y consulta los movimientos internos de caja
          </p>
        </div>
        <Link href="/ingresos-egresos/nuevo" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nuevo movimiento
        </Link>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ingresos" value={formatMXN(summary.ingresos)} tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Egresos" value={formatMXN(summary.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Neto" value={formatMXN(summary.neto)} tone={summary.neto >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} />
      </section>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
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
      </form>

      <div className="text-sm text-muted-foreground">
        {total} movimiento{total === 1 ? "" : "s"}{hasFilters ? " (filtrados)" : ""}
      </div>
      <EntriesTable rows={rows} hrefBase="/ingresos-egresos" emptyText="No hay movimientos que coincidan." />
    </div>
  );
}
