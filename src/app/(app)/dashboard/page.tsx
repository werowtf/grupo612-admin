import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Clock, ArrowRight, Info } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueSummary, getVenueTransactions, getVenueDailyTotals } from "@/lib/queries";
import { StatCard } from "@/components/stat-card";
import { CategoryBadge } from "@/components/badges";
import { AreaChartInteractive } from "@/components/area-chart-interactive";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { categoryBar } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";

export default async function DashboardPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <EmptyMessage title="Sin negocios asignados">
        Tu usuario aún no tiene negocios asignados. Contacta al administrador.
      </EmptyMessage>
    );
  }

  const [summary, recent, dailyTotals] = await Promise.all([
    getVenueSummary(selected.id),
    getVenueTransactions(selected.id, { take: 6 }),
    getVenueDailyTotals(selected.id),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen financiero</p>
      </header>

      {summary.count === 0 ? (
        <EmptyMessage title="Aún no hay movimientos">
          Importa el primer estado de cuenta para ver el resumen financiero.
          <div className="mt-4">
            <Link href="/conciliacion" className={buttonVariants()}>
              Ir a estados de cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </EmptyMessage>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Abonos (entradas)"
              value={formatMXN(summary.totalAbonos)}
              tone="positive"
              icon={<TrendingUp className="h-4 w-4" />}
            />
            <StatCard
              label="Cargos (salidas)"
              value={formatMXN(summary.totalCargos)}
              tone="negative"
              icon={<TrendingDown className="h-4 w-4" />}
            />
            <StatCard
              label="Neto"
              value={formatMXN(summary.neto)}
              tone={summary.neto >= 0 ? "positive" : "negative"}
              icon={<Wallet className="h-4 w-4" />}
            />
            <StatCard
              label="Pendientes de conciliar"
              value={String(summary.pendientes)}
              hint={`${summary.count} movimientos en total`}
              tone="pending"
              icon={<Clock className="h-4 w-4" />}
            />
          </section>

          <AreaChartInteractive data={dailyTotals} />

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="card min-w-0 p-5">
              <h2 className="mb-4 text-base font-semibold">Por categoría</h2>
              <CategoryBreakdown items={summary.byCategory} />
            </div>

            <div className="card min-w-0 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Movimientos recientes</h2>
                <Link
                  href="/movimientos"
                  className="text-sm text-brand-600 hover:underline"
                >
                  Ver todos
                </Link>
              </div>
              {recent.rows.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Ninguno todavía.</span>
                </div>
              ) : (
                <ul className="space-y-2">
                  {recent.rows.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.description}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(t.date)}</div>
                      </div>
                      <span
                        className={cn(
                          "ml-3 shrink-0 font-semibold tabular-nums",
                          t.direction === "CARGO" ? "text-cargo" : "text-abono",
                        )}
                      >
                        {formatMXN(t.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function CategoryBreakdown({
  items,
}: {
  items: { category: import("@/generated/prisma/enums").TxCategory; total: number; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.total), 1);
  return (
    <ul className="space-y-6">
      {items.map((i) => (
        <li key={i.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <CategoryBadge category={i.category} />
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold">{formatMXN(i.total)}</span>{" "}
              <span className="text-xs">({i.count})</span>
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", categoryBar[i.category])}
              style={{ width: `${(i.total / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function EmptyMessage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
