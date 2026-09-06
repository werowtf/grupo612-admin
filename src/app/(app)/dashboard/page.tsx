import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Clock, ArrowRight, Info, ChefHat, Wine, Percent } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueSummary, getVenueTransactions } from "@/lib/queries";
import { getVenueDailySalesTotals } from "@/lib/daily-sales/queries";
import { getCostoVentaMes } from "@/lib/dashboard/costo-venta";
import { StatCard } from "@/components/stat-card";
import { CategoryBadge } from "@/components/badges";
import { AreaChartInteractive } from "@/components/area-chart-interactive";
import { RANGES, type RangeKey } from "@/lib/dashboard/ranges";
import { MonthPicker } from "@/components/month-picker";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { categoryBar } from "@/lib/labels";
import { buttonVariants } from "@/components/ui/button";

function parseMonth(raw: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(raw ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function fmtPct(pct: number | null): string {
  return pct === null ? "—" : `${pct.toFixed(1)}%`;
}

function parseRango(raw: string | undefined): RangeKey {
  return raw === "7d" || raw === "90d" ? raw : "30d";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; rango?: string }>;
}) {
  const { selected } = await getAppContext();
  const sp = await searchParams;

  if (!selected) {
    return (
      <EmptyMessage title="Sin negocios asignados">
        Tu usuario aún no tiene negocios asignados. Contacta al administrador.
      </EmptyMessage>
    );
  }

  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;
  const rango = parseRango(sp.rango);
  const days = RANGES[rango].days;

  const [summaryAll, summary, recent, dailySalesTotals, costoVenta] = await Promise.all([
    getVenueSummary(selected.id), // sólo para saber si hay movimientos alguna vez (onboarding)
    getVenueSummary(selected.id, days),
    getVenueTransactions(selected.id, { take: 6 }),
    getVenueDailySalesTotals(selected.id, days),
    getCostoVentaMes(selected.id, year, month),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Resumen financiero</p>
      </header>

      {summaryAll.count === 0 ? (
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

          <AreaChartInteractive data={dailySalesTotals} range={rango} />

          <section className="card min-w-0 space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold">% Costo de venta</h2>
              <form method="get" className="flex items-center gap-2">
                <MonthPicker name="mes" defaultValue={mesValue} />
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-600 hover:text-white"
                >
                  Ver
                </button>
              </form>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Costo de venta — Cocina"
                value={fmtPct(costoVenta.cocina.pct)}
                hint={`${formatMXN(costoVenta.cocina.costo)} de gasto / ${formatMXN(costoVenta.cocina.venta)} de venta`}
                icon={<ChefHat className="h-4 w-4" />}
              />
              <StatCard
                label="Costo de venta — Barra"
                value={fmtPct(costoVenta.barra.pct)}
                hint={`${formatMXN(costoVenta.barra.costo)} de gasto / ${formatMXN(costoVenta.barra.venta)} de venta`}
                icon={<Wine className="h-4 w-4" />}
              />
              <StatCard
                label="Costo de venta general"
                value={fmtPct(costoVenta.general.pct)}
                hint={`${formatMXN(costoVenta.general.costo)} de gasto / ${formatMXN(costoVenta.general.venta)} de venta`}
                icon={<Percent className="h-4 w-4" />}
              />
            </div>
          </section>

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
