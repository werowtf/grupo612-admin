import Link from "next/link";
import { Search, X } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueTransactions, type TxFilters } from "@/lib/queries";
import { TransactionsTable } from "@/components/transactions-table";
import { toTxRow } from "@/lib/serialize";
import { categoryLabels, statusLabels } from "@/lib/labels";
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
  "OTRO",
];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

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
      <div className="card p-10 text-center text-sm text-[var(--color-muted)]">
        Tu usuario no tiene sucursales asignadas.
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
  const hasFilters = Boolean(
    filters.category || filters.direction || filters.status || filters.search,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Movimientos</h1>
        <p className="text-sm text-[var(--color-muted)]">
          {selected.name} · {total} movimiento{total === 1 ? "" : "s"}
          {hasFilters ? " (filtrados)" : ""}
        </p>
      </header>

      <form method="get" className="card flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-[180px] flex-1">
          <label className="label" htmlFor="search">
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-[var(--color-muted)]" />
            <input
              id="search"
              name="search"
              defaultValue={filters.search ?? ""}
              placeholder="Descripción, referencia…"
              className="input pl-8"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="category">
            Categoría
          </label>
          <select id="category" name="category" defaultValue={filters.category ?? ""} className="input">
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabels[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="direction">
            Tipo
          </label>
          <select id="direction" name="direction" defaultValue={filters.direction ?? ""} className="input">
            <option value="">Todos</option>
            <option value="ABONO">Abonos</option>
            <option value="CARGO">Cargos</option>
          </select>
        </div>

        <div>
          <label className="label" htmlFor="status">
            Estatus
          </label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="input">
            <option value="">Todos</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="btn-primary">
            Filtrar
          </button>
          {hasFilters && (
            <Link href="/movimientos" className="btn-ghost">
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
