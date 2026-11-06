import { notFound, redirect } from "next/navigation";
import { Percent } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isOficinaSelected } from "@/lib/venue";
import { getComisionesMes } from "@/lib/comisiones/queries";
import { FormMonthPicker } from "@/components/form-month-picker";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

const pct = (n: number) => `${Number((n * 100).toFixed(2))}%`;

export default async function OficinaComisionesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();
  // Comisiones solo se ve en modo Oficina: desde un negocio no se abre ni por dirección directa.
  if (!(await isOficinaSelected())) redirect("/dashboard");

  const sp = await searchParams;
  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;

  const rows = await getComisionesMes(year, month);
  const totales = rows.reduce(
    (a, r) => ({
      efectivo: a.efectivo + r.efectivo,
      tarjeta: a.tarjeta + r.tarjeta,
      credito: a.credito + r.credito,
      base: a.base + r.base,
      comision: a.comision + r.comision,
    }),
    { efectivo: 0, tarjeta: 0, credito: 0, base: 0, comision: 0 },
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Comisiones</h1>
        <p className="text-sm text-muted-foreground">
          Comisión para la Nómina Administrativa de {MONTHS[month - 1]} {year}: venta total del mes × porcentaje de cada negocio.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Comisión total" value={formatMXN(totales.comision)} tone="positive" icon={<Percent className="h-4 w-4" />} />
        {rows.map((r) => (
          <StatCard key={r.slug} label={`${r.venue} · ${pct(r.porcentaje)}`} value={formatMXN(r.comision)} />
        ))}
      </section>

      <div>
        <label className="label">Mes</label>
        <FormMonthPicker name="mes" defaultValue={mesValue} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Negocio</th>
                <th className="px-3 py-2 text-right font-semibold">%</th>
                <th className="px-3 py-2 text-right font-semibold">Días</th>
                <th className="px-3 py-2 text-right font-semibold">Efectivo</th>
                <th className="px-3 py-2 text-right font-semibold">Tarjeta</th>
                <th className="px-3 py-2 text-right font-semibold">Crédito</th>
                <th className="px-3 py-2 text-right font-semibold">Venta total</th>
                <th className="px-3 py-2 text-right font-semibold">Comisión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.slug} className="hover:bg-muted/60">
                  <td className="px-3 py-2 font-semibold">{r.venue}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{pct(r.porcentaje)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{r.dias}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.efectivo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.tarjeta)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(r.credito)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMXN(r.base)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-abono">{formatMXN(r.comision)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-table-header/60 font-semibold">
                <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground" colSpan={3}>Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totales.efectivo)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totales.tarjeta)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totales.credito)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMXN(totales.base)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(totales.comision)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Venta total = efectivo + tarjeta + crédito de la venta diaria del mes (la tarjeta incluye las propinas con tarjeta), igual que
        el libro contable. Comisariato no genera comisión.
      </p>
    </div>
  );
}
