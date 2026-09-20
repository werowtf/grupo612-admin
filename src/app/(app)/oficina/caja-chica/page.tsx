import { notFound } from "next/navigation";
import { PiggyBank, Wallet, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getCajaChicaConsolidada } from "@/lib/oficina/queries";
import { StatCard } from "@/components/stat-card";
import { formatMXN, formatDate, cn } from "@/lib/utils";

export default async function OficinaCajaChicaPage() {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();

  const { porNegocio, ultimosGastos } = await getCajaChicaConsolidada();
  const fondo = porNegocio.reduce((s, v) => s + v.fondo, 0);
  const gastado = porNegocio.reduce((s, v) => s + v.gastado, 0);
  const disponible = fondo - gastado;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Caja Chica</h1>
        <p className="text-sm text-muted-foreground">
          Fondo aprobado, gastado y disponible de los 4 negocios. Para aprobar fondos o registrar gastos, entra al negocio.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Fondo aprobado" value={formatMXN(fondo)} icon={<PiggyBank className="h-4 w-4" />} />
        <StatCard label="Gastado" value={formatMXN(gastado)} tone="negative" icon={<Receipt className="h-4 w-4" />} />
        <StatCard
          label="Disponible"
          value={formatMXN(disponible)}
          tone={disponible >= 0 ? "positive" : "negative"}
          icon={<Wallet className="h-4 w-4" />}
        />
      </section>

      <section className="card min-w-0 space-y-3 p-3 sm:p-5">
        <h2 className="text-base font-semibold">Por negocio</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Negocio</th>
                <th className="px-3 py-2 text-right font-semibold">Fondo</th>
                <th className="px-3 py-2 text-right font-semibold">Gastado</th>
                <th className="px-3 py-2 text-right font-semibold">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {porNegocio.map((v) => (
                <tr key={v.venueId} className="hover:bg-muted/40">
                  <td className="whitespace-nowrap px-3 py-2 font-semibold">{v.venueName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{formatMXN(v.fondo)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(v.gastado)}</td>
                  <td className={cn("px-3 py-2 text-right tabular-nums font-semibold", v.disponible >= 0 ? "text-abono" : "text-cargo")}>
                    {formatMXN(v.disponible)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-table-header/60 font-semibold">
                <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMXN(fondo)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(gastado)}</td>
                <td className={cn("px-3 py-2 text-right tabular-nums", disponible >= 0 ? "text-abono" : "text-cargo")}>
                  {formatMXN(disponible)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="card min-w-0 space-y-3 p-3 sm:p-5">
        <h2 className="text-base font-semibold">Gastos recientes</h2>
        {ultimosGastos.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No hay gastos de caja chica registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Negocio</th>
                  <th className="px-3 py-2 font-semibold">Empleado</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Categoría</th>
                  <th className="hidden px-3 py-2 font-semibold sm:table-cell">Descripción</th>
                  <th className="px-3 py-2 text-right font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ultimosGastos.map((g) => (
                  <tr key={g.id} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(g.date)}</td>
                    <td className="px-3 py-2">{g.venue.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{g.employee}</td>
                    <td className="hidden px-3 py-2 sm:table-cell">{g.category}</td>
                    <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">{g.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(Number(g.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
