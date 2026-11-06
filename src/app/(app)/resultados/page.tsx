import { Suspense } from "react";
import { notFound } from "next/navigation";
import { TrendingUp, Wallet, Percent, Scale } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getEstadoResultados } from "@/lib/resultados/queries";
import { PAY_COLUMNS, type StatementLine } from "@/lib/resultados/statement";
import { ResultadosActions } from "@/components/resultados-actions";
import { ResultadosSkeleton } from "@/components/resultados-skeleton";
import { StatCard } from "@/components/stat-card";
import { formatMXN, cn } from "@/lib/utils";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** El estado de resultados lo ven quienes llevan la operación y la contabilidad. */
const ALLOWED_ROLES = ["ADMIN", "GERENTE", "CONTADOR"];

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

const money = (n: number) => (Math.abs(n) < 0.005 ? "—" : formatMXN(n));
const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

function LineRow({ line }: { line: StatementLine }) {
  if (line.kind === "section") {
    return (
      <tr className="bg-table-header/70">
        <td colSpan={8} className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-600">
          {line.label}
        </td>
      </tr>
    );
  }
  const strong = line.kind !== "row";
  const negative = line.kind === "result" && (line.total ?? 0) < 0;
  return (
    <tr
      className={cn(
        "hover:bg-muted/60",
        line.kind === "subtotal" && "border-t border-border bg-muted/30 font-medium",
        line.kind === "total" && "border-t border-border bg-table-header/40 font-semibold",
        line.kind === "result" && "border-y border-border bg-muted font-semibold",
      )}
    >
      <td className={cn("px-3 py-1.5", line.kind === "row" && "pl-6")}>{line.label}</td>
      {line.cells
        ? line.cells.map((c, idx) => (
            <td key={idx} className={cn("px-3 py-1.5 text-right tabular-nums", !strong && "text-muted-foreground", c < 0 && "text-cargo")}>
              {money(c)}
            </td>
          ))
        : PAY_COLUMNS.map((_, idx) => <td key={idx} />)}
      <td className={cn("px-3 py-1.5 text-right tabular-nums", strong ? "font-semibold" : "font-medium", negative && "text-cargo")}>
        {line.total == null ? "" : line.kind === "row" || strong ? money(line.total) : formatMXN(line.total)}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 text-right text-xs tabular-nums text-muted-foreground" title={line.pctLabel}>
        {line.pct != null && pct(line.pct)}
      </td>
    </tr>
  );
}

/** Tarjetas de resumen, tabla y notas: lo único que consulta datos (se carga con su esqueleto). */
async function ResultadosContent({ venue, year, month }: { venue: { id: string; slug: string }; year: number; month: number }) {
  const { lines, kpis } = await getEstadoResultados(venue, year, month);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ingreso total" value={formatMXN(kpis.ingresoTotal)} tone="positive" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Utilidad bruta" value={formatMXN(kpis.utilidadBruta)} tone={kpis.utilidadBruta >= 0 ? "positive" : "negative"} icon={<Scale className="h-4 w-4" />} />
        <StatCard label="Utilidad operativa" value={formatMXN(kpis.utilidadOperativa)} tone={kpis.utilidadOperativa >= 0 ? "positive" : "negative"} icon={<Wallet className="h-4 w-4" />} />
        <StatCard
          label="Utilidad neta"
          value={formatMXN(kpis.utilidadNeta)}
          hint={kpis.pctUtilidad == null ? undefined : `${pct(kpis.pctUtilidad)} sobre la venta`}
          tone={kpis.utilidadNeta >= 0 ? "positive" : "negative"}
          icon={<Percent className="h-4 w-4" />}
        />
      </section>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Concepto</th>
                {PAY_COLUMNS.map((c) => (
                  <th key={c} className="px-3 py-2 text-right font-semibold">{c}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2 text-right font-semibold" title="Costo de venta y utilidad sobre la venta">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line, i) => (
                <LineRow key={i} line={line} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Ventas: venta diaria del mes (la tarjeta incluye las propinas con tarjeta). Gastos: egresos del mes por categoría y forma de pago.
        Nómina admin: comisión del mes (venta total × porcentaje, ver Oficina → Comisiones). Comisiones bancarias: movimientos bancarios
        de categoría Comisión (cargos menos abonos). Impuestos: estimado de 19.181% sobre la utilidad antes de impuestos; los egresos de
        categoría Impuestos y los préstamos entre negocios no se cuentan.
      </p>
    </div>
  );
}

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user, selected } = await getAppContext();
  if (!ALLOWED_ROLES.includes(user.role)) notFound();
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl">Resultados</h1>
          <p className="text-sm text-muted-foreground">
            Estado de resultados de {selected.name} · {MONTHS[month - 1]} {year}
          </p>
        </div>
        <ResultadosActions key={mesValue} mes={mesValue} />
      </header>

      {/* key = mes: al cambiar de mes se muestra el esqueleto mientras llegan los datos nuevos. */}
      <Suspense key={mesValue} fallback={<ResultadosSkeleton />}>
        <ResultadosContent venue={selected} year={year} month={month} />
      </Suspense>
    </div>
  );
}
