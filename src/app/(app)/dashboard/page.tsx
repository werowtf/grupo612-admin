import Link from "next/link";
import { TrendingUp, TrendingDown, Wallet, Clock, ArrowRight, Info, ChefHat, Wine, Percent, Building2, CreditCard, HandCoins, Link2 } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueSummary, getVenueTransactions } from "@/lib/queries";
import { getVenueDailySalesTotals } from "@/lib/daily-sales/queries";
import { getCostoVentaMes } from "@/lib/dashboard/costo-venta";
import { getMonthlyReport } from "@/lib/reports/queries";
import { prisma } from "@/lib/prisma";
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
  const { selected, oficina } = await getAppContext();
  const sp = await searchParams;

  if (oficina) {
    return <OficinaDashboard mes={sp.mes} />;
  }

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

/**
 * Dashboard consolidado "Oficina": totaliza los 4 negocios activos (no sólo
 * los del usuario) en el mes elegido, reusando getMonthlyReport — ya suma
 * cortes, banco, ingresos/egresos y conciliación por negocio.
 */
async function OficinaDashboard({ mes }: { mes: string | undefined }) {
  const { year, month } = parseMonth(mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;

  const venues = await prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const venueIds = venues.map((v) => v.id);

  const [total, porNegocio] = await Promise.all([
    getMonthlyReport(venueIds, year, month),
    Promise.all(venues.map((v) => getMonthlyReport([v.id], year, month))),
  ]);

  const conciliadoPct =
    total.conciliacion.cortesConTarjeta > 0
      ? Math.round((total.conciliacion.cortesConciliados / total.conciliacion.cortesConTarjeta) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl">Oficina</h1>
          <p className="text-sm text-muted-foreground">Consolidado de los 4 negocios · {total.period.label}</p>
        </div>
        <form method="get" className="flex items-center gap-2">
          <MonthPicker name="mes" defaultValue={mesValue} />
          <button
            type="submit"
            className="cursor-pointer rounded-lg border border-brand-600 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-600 hover:text-white"
          >
            Ver
          </button>
        </form>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas del mes"
          value={formatMXN(total.ventas.total)}
          hint={`${total.ventas.cortes} cortes en total`}
          tone="positive"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard label="Ventas con tarjeta" value={formatMXN(total.ventas.tarjeta)} tone="positive" icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Egresos registrados" value={formatMXN(total.finanzas.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Propinas" value={formatMXN(total.ventas.propinas)} valueClassName="text-chart-3" icon={<HandCoins className="h-4 w-4" />} />
        <StatCard label="Comisiones bancarias" value={formatMXN(total.banco.comisiones)} valueClassName="text-chart-3" icon={<Percent className="h-4 w-4" />} />
        <StatCard label="Neto bancario" value={formatMXN(total.banco.abonos - total.banco.cargos)} tone={total.banco.abonos - total.banco.cargos >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} />
        <StatCard
          label="Cortes conciliados"
          value={`${total.conciliacion.cortesConciliados}/${total.conciliacion.cortesConTarjeta}`}
          hint={`${conciliadoPct}% con depósito bancario`}
          tone={conciliadoPct >= 100 ? "positive" : "default"}
          icon={<Link2 className="h-4 w-4" />}
        />
        <StatCard label="Negocios" value={String(venues.length)} icon={<Building2 className="h-4 w-4" />} />
      </section>

      <section className="card min-w-0 overflow-hidden p-0">
        <h2 className="p-5 pb-0 text-base font-semibold">Por negocio</h2>
        <div className="overflow-x-auto p-5 pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Negocio</th>
                <th className="px-3 py-2 text-right font-semibold">Ventas</th>
                <th className="px-3 py-2 text-right font-semibold">Egresos</th>
                <th className="px-3 py-2 text-right font-semibold">Abonos banco</th>
                <th className="px-3 py-2 text-right font-semibold">Cargos banco</th>
                <th className="px-3 py-2 text-right font-semibold">Neto bancario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {venues.map((v, i) => {
                const r = porNegocio[i];
                const neto = r.banco.abonos - r.banco.cargos;
                return (
                  <tr key={v.id} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{v.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(r.ventas.total)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(r.finanzas.egresos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(r.banco.abonos)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(r.banco.cargos)}</td>
                    <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", neto >= 0 ? "text-abono" : "text-cargo")}>
                      {formatMXN(neto)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-table-header/60 font-semibold">
                <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(total.ventas.total)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(total.finanzas.egresos)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(total.banco.abonos)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(total.banco.cargos)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", total.banco.abonos - total.banco.cargos >= 0 ? "text-abono" : "text-cargo")}>
                  {formatMXN(total.banco.abonos - total.banco.cargos)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Ventas e IVA provienen de los cortes de caja; egresos, de los movimientos registrados;
        abonos/cargos y comisiones, de los estados de cuenta bancarios. Los importes reflejan lo
        capturado en el periodo, para los 4 negocios activos.
      </p>
    </div>
  );
}
