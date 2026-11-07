import { cache, Suspense } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { FormMonthPicker } from "@/components/form-month-picker";
import { MovimientosExcelLink } from "@/components/movimientos-excel-link";
import { MovimientosStatsSkeleton, MovimientosTableSkeleton } from "@/components/page-skeletons";

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

interface Query {
  venueId: string;
  year: number;
  month: number;
  category: string;
  direction: string;
  status: string;
  search: string;
}

/**
 * Datos de la página. Con `cache`, el contador, las tarjetas y la tabla comparten
 * una sola consulta por petición aunque cada uno cargue por separado (con su esqueleto).
 */
const loadMovimientos = cache(
  async (venueId: string, year: number, month: number, category: string, direction: string, status: string, search: string) => {
    const filters: TxFilters = {
      category: pick<TxCategory>(category, CATEGORIES),
      direction: pick<TxDirection>(direction, ["CARGO", "ABONO"]),
      status: pick<TxStatus>(status, STATUSES),
      search: search || undefined,
      dateFrom: new Date(Date.UTC(year, month - 1, 1)),
      dateTo: new Date(Date.UTC(year, month, 1)), // exclusivo
      // La vista está acotada a un mes; 2000 cubre con margen incluso un mes
      // de actividad muy alta sin arriesgar recortar movimientos en silencio.
      take: 2000,
    };

    const { rows, total } = await getVenueTransactions(venueId, filters);
    const categoryTotals = await getCategoryTotals(venueId, {
      direction: filters.direction,
      status: filters.status,
      search: filters.search,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    // Pie de la tabla: mismos filtros que la tabla (incluida la categoría). Con una
    // categoría elegida solo cuenta esa; las demás quedan en cero.
    const footerTotals: Record<TxCategory, number> = filters.category
      ? { TRANSFERENCIA: 0, CHEQUE: 0, DEPOSITO: 0, COMISION: 0, GASTO_TARJETA: 0, [filters.category]: categoryTotals[filters.category] }
      : categoryTotals;
    return { rows, total, categoryTotals, footerTotals };
  },
);

const load = (q: Query) => loadMovimientos(q.venueId, q.year, q.month, q.category, q.direction, q.status, q.search);

async function MovimientosSubtitle({ q, hasFilters }: { q: Query; hasFilters: boolean }) {
  const { total } = await load(q);
  return (
    <>
      {total} movimiento{total === 1 ? "" : "s"} · {MONTHS[q.month - 1]} {q.year}
      {hasFilters ? " (filtrados)" : ""}
    </>
  );
}

async function MovimientosStats({ q }: { q: Query }) {
  const { categoryTotals } = await load(q);
  return (
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
  );
}

async function MovimientosTable({ q }: { q: Query }) {
  const { rows, total, footerTotals } = await load(q);
  return <TransactionsTable rows={rows.map(toTxRow)} showMerchant showTotals totals={{ count: total, byCategory: footerTotals }} />;
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

  // Filtros ya validados (los mismos que usan las consultas y el formulario).
  const category = pick<TxCategory>(sp.category, CATEGORIES);
  const direction = pick<TxDirection>(sp.direction, ["CARGO", "ABONO"]);
  const status = pick<TxStatus>(sp.status, STATUSES);
  const search = sp.search?.trim() ?? "";
  const q: Query = {
    venueId: selected.id,
    year,
    month,
    category: category ?? "",
    direction: direction ?? "",
    status: status ?? "",
    search,
  };
  const hasFilters = Boolean(category || direction || status || search);

  // key = mes: al cambiar de mes se muestra el esqueleto mientras llegan los datos nuevos.
  // El formulario de filtros queda fuera, así el selector de mes no desaparece.
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Movimientos</h1>
          <div className="text-sm text-muted-foreground">
            <Suspense key={`total-${mesValue}`} fallback={<Skeleton className="h-4 w-52" />}>
              <MovimientosSubtitle q={q} hasFilters={hasFilters} />
            </Suspense>
          </div>
        </div>
        {/* Mismos filtros que la pantalla (mes, categoría, tipo, estatus, búsqueda). */}
        <MovimientosExcelLink
          mes={mesValue}
          filters={Object.fromEntries(
            Object.entries({ category: sp.category, direction: sp.direction, status: sp.status, search: sp.search }).filter(
              (e): e is [string, string] => Boolean(e[1]) && e[1] !== "todas" && e[1] !== "todos",
            ),
          )}
        />
      </header>

      <Suspense key={`tarjetas-${mesValue}`} fallback={<MovimientosStatsSkeleton />}>
        <MovimientosStats q={q} />
      </Suspense>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label font-semibold">Mes</label>
          <FormMonthPicker name="mes" defaultValue={mesValue} />
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
              defaultValue={search}
              placeholder="Descripción, referencia…"
              className="pl-8 font-semibold"
            />
          </div>
        </div>

        <div className="min-w-[160px]">
          <label className="label font-semibold" htmlFor="category">
            Categoría
          </label>
          <Select name="category" defaultValue={category ?? "todas"}>
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
          <Select name="direction" defaultValue={direction ?? "todos"}>
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
          <Select name="status" defaultValue={status ?? "todos"}>
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

      <Suspense key={`tabla-${mesValue}`} fallback={<MovimientosTableSkeleton />}>
        <MovimientosTable q={q} />
      </Suspense>
    </div>
  );
}
