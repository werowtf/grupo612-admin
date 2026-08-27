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
import { MonthPicker } from "@/components/month-picker";

const FILTER_TRIGGER_CLASS =
  "h-8 w-full border-transparent bg-field-bg font-semibold text-foreground hover:bg-muted/50";
import type {
  TxCategory,
  TxDirection,
  TxStatus,
} from "@/generated/prisma/enums";

const CATEGORIES: TxCategory[] = [
  "DEPOSITO",
  "TRANSFERENCIA",
  "GASTO_TARJETA",
  "CHEQUE",
  "COMISION",
];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
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

  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;
  const dateFrom = new Date(Date.UTC(year, month - 1, 1));
  const dateTo = new Date(Date.UTC(year, month, 1)); // exclusivo

  const filters: TxFilters = {
    category: pick<TxCategory>(sp.category, CATEGORIES),
    direction: pick<TxDirection>(sp.direction, ["CARGO", "ABONO"]),
    status: pick<TxStatus>(sp.status, STATUSES),
    search: sp.search?.trim() || undefined,
    dateFrom,
    dateTo,
    // La vista está acotada a un mes; 2000 cubre con margen incluso un mes
    // de actividad muy alta sin arriesgar recortar movimientos en silencio.
    take: 2000,
  };

  const { rows, total } = await getVenueTransactions(selected.id, filters);
  const categoryTotals = await getCategoryTotals(selected.id, {
    direction: filters.direction,
    status: filters.status,
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const hasFilters = Boolean(
    filters.category || filters.direction || filters.status || filters.search,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Movimientos</h1>
        <p className="text-sm text-muted-foreground">
          {total} movimiento{total === 1 ? "" : "s"} · {MONTHS[month - 1]} {year}
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
        <div>
          <label className="label font-semibold">Mes</label>
          <MonthPicker name="mes" defaultValue={mesValue} />
        </div>

        <div className="min-w-[180px] flex-1">
          <label className="label font-semibold" htmlFor="search">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Descripción, referencia…"
              className="pl-8 font-semibold"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <label className="label font-semibold" htmlFor="category">
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

        <div className="min-w-[160px]">
          <label className="label font-semibold" htmlFor="direction">
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

        <div className="min-w-[160px]">
          <label className="label font-semibold" htmlFor="status">
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
