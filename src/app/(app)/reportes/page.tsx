import { TrendingUp, CreditCard, Percent, TrendingDown, HandCoins, Link2 } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getMonthlyReport } from "@/lib/reports/queries";
import { StatCard } from "@/components/stat-card";
import { BarList } from "@/components/charts";
import { PieChartCard } from "@/components/pie-chart-card";
import { ReportActions } from "@/components/report-actions";
import { categoryLabels } from "@/lib/labels";
import { formatMXN } from "@/lib/utils";
import { ReportMonthPicker } from "@/components/report-month-picker";
import type { TxCategory } from "@/generated/prisma/enums";

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function ReportesPage({
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

  const report = await getMonthlyReport([selected.id], year, month);

  const exportHref = `/api/reportes/export?mes=${mesValue}&venue=${selected.id}`;
  const conciliadoPct =
    report.conciliacion.cortesConTarjeta > 0
      ? Math.round((report.conciliacion.cortesConciliados / report.conciliacion.cortesConTarjeta) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Reportes</h1>
          <p className="text-sm text-muted-foreground">{report.period.label}</p>
        </div>
        <ReportActions exportHref={exportHref} />
      </header>

      <div className="card flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div>
          <label className="label">Mes</label>
          <ReportMonthPicker defaultValue={mesValue} />
        </div>
      </div>

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Ventas del mes" value={formatMXN(report.ventas.total)} hint={`${report.ventas.cortes} cortes`} tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Ventas con tarjeta" value={formatMXN(report.ventas.tarjeta)} tone="positive" icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="Comisiones bancarias" value={formatMXN(report.banco.comisiones)} tone="negative" icon={<Percent className="h-4 w-4" />} />
        <StatCard label="Egresos registrados" value={formatMXN(report.finanzas.egresos)} tone="negative" icon={<TrendingDown className="h-4 w-4" />} />
        <StatCard label="Propinas" value={formatMXN(report.ventas.propinas)} tone="positive" icon={<HandCoins className="h-4 w-4" />} />
        <StatCard label="Cortes conciliados" value={`${report.conciliacion.cortesConciliados}/${report.conciliacion.cortesConTarjeta}`} hint={`${conciliadoPct}% con depósito bancario`} tone={conciliadoPct >= 100 ? "positive" : "default"} icon={<Link2 className="h-4 w-4" />} />
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card min-w-0 p-5">
          <h2 className="mb-4 text-base font-semibold">Ventas por forma de pago</h2>
          <PieChartCard
            items={[
              { label: "Efectivo", value: report.ventas.efectivo },
              { label: "Visa", value: report.ventas.visa },
              { label: "Mastercard", value: report.ventas.mastercard },
              { label: "American Express", value: report.ventas.amex },
            ]}
          />
        </div>
        <div className="card min-w-0 p-5">
          <h2 className="mb-4 text-base font-semibold">Ventas por producto</h2>
          <PieChartCard
            items={[
              { label: "Alimentos", value: report.ventas.alimentos },
              { label: "Bebidas", value: report.ventas.bebidas },
            ]}
          />
        </div>
        <div className="card min-w-0 p-5">
          <h2 className="mb-4 text-base font-semibold">Abonos vs. cargos del banco</h2>
          <PieChartCard
            items={[
              { label: "Abonos", value: report.banco.abonos },
              { label: "Cargos", value: report.banco.cargos },
            ]}
            colors={["var(--color-abono)", "var(--color-cargo)"]}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card min-w-0 p-5">
          <h2 className="mb-4 text-base font-semibold">Salidas del banco por categoría</h2>
          <BarList
            items={report.banco.cargosByCategory.map((c) => ({
              label: categoryLabels[c.category as TxCategory] ?? c.category,
              value: c.total,
            }))}
          />
        </div>
        <div className="card min-w-0 p-5">
          <h2 className="mb-4 text-base font-semibold">Egresos registrados por categoría</h2>
          <BarList items={report.finanzas.egresosByCategory.map((c) => ({ label: c.category, value: c.total }))} />
        </div>
      </section>

      {/* Conciliación */}
      <section className="card min-w-0 p-5">
        <h2 className="mb-4 text-base font-semibold">Conciliación de ventas con tarjeta</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Tarjeta esperada (cortes)</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">{formatMXN(report.conciliacion.tarjetaEsperada)}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Depositado en banco</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-brand-600">{formatMXN(report.conciliacion.depositado)}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Diferencia (≈ comisión)</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums text-cargo">
              {formatMXN(report.conciliacion.tarjetaEsperada - report.conciliacion.depositado)}
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Ventas e IVA provienen de los cortes de caja; comisiones y flujo, de los estados de cuenta;
        egresos, de los movimientos registrados. Los importes reflejan lo capturado en el periodo.
      </p>
    </div>
  );
}
