import Link from "next/link";
import { Search, X, ArrowDownToLine, ArrowLeftRight, Banknote, Percent, CreditCard } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueTransactions, getCategoryTotals, type TxFilters } from "@/lib/queries";
import { TransactionsTable } from "@/components/transactions-table";
import { StatCard } from "@/components/stat-card";
import { toTxRow } from "@/lib/serialize";
import { categoryLabels, categoryText, statusLabels } from "@/lib/labels";
import { formatMXN } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FILTER_TRIGGER_CLASS =
  "h-8 w-full border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50";
import type {
  TxCategory,
  TxDirection,
  TxStatus,
} from "@/generated/prisma/enums";

const CATEGORIES: TxCategory[] = [
  "DEPOSITO",
  "TRANSFERENCIA",
  "CHEQUE",
  "COMISION",
  "GASTO_TARJETA",
];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

const CATEGORY_ICONS: Record<TxCategory, React.ReactNode> = {
  DEPOSITO: <ArrowDownToLine className="h-4 w-4" />,
  TRANSFERENCIA: <ArrowLeftRight className="h-4 w-4" />,
  CHEQUE: <Banknote className="h-4 w-4" />,
  COMISION: <Percent className="h-4 w-4" />,
  GASTO_TARJETA: <CreditCard className="h-4 w-4" />,
};

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export default async function MovimientosPage({
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

  const filters: TxFilters = {
    category: pick<TxCategory>(sp.category, CATEGORIES),
    direction: pick<TxDirection>(sp.direction, ["CARGO", "ABONO"]),
    status: pick<TxStatus>(sp.status, STATUSES),
    search: sp.search?.trim() || undefined,
    take: 300,
  };

  const { rows, total } = await getVenueTransactions(selected.id, filters);
  const categoryTotals = await getCategoryTotals(selected.id, {
    direction: filters.direction,
    status: filters.status,
    search: filters.search,
  });
  const hasFilters = Boolean(
    filters.category || filters.direction || filters.status || filters.search,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          {total} movimiento{total === 1 ? "" : "s"}
          {hasFilters ? " (filtrados)" : ""}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => (
          <StatCard
            key={c}
            label={categoryLabels[c]}
            value={formatMXN(categoryTotals[c])}
            valueClassName={categoryText[c]}
            icon={CATEGORY_ICONS[c]}
          />
        ))}
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label" htmlFor="search">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Descripción, referencia…"
              className="pl-8"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="category">
            Categoría
          </label>
          <Select name="category" defaultValue={filters.category ?? "todas"}>
            <SelectTrigger id="category" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="label" htmlFor="direction">
            Tipo
          </label>
          <Select name="direction" defaultValue={filters.direction ?? "todos"}>
            <SelectTrigger id="direction" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ABONO">Abonos</SelectItem>
              <SelectItem value="CARGO">Cargos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="label" htmlFor="status">
            Estatus
          </label>
          <Select name="status" defaultValue={filters.status ?? "todos"}>
            <SelectTrigger id="status" className={FILTER_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabels[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button type="submit">Filtrar</Button>
          {hasFilters && (
            <Link href="/movimientos" className={buttonVariants({ variant: "outline" })}>
              <X className="h-4 w-4" />
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <TransactionsTable rows={rows.map(toTxRow)} />
    </div>
  );
}
