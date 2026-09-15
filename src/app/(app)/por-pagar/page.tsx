import { HandCoins } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getPropinasPendientes, getPropinasPorCorte, getCuentasPorPagar } from "@/lib/por-pagar/queries";
import { getVenueCategories } from "@/lib/entries/queries";
import { CuentasPorPagarManager, type CuentaPorPagarRow } from "@/components/cuentas-por-pagar-manager";
import { PropinasPorCorteManager, type PropinaRow } from "@/components/propinas-por-corte-manager";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";

export default async function PorPagarPage() {
  const { selected, user } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const [propinasPendientes, propinasPorCorte, cuentas, categories] = await Promise.all([
    getPropinasPendientes(selected.id),
    getPropinasPorCorte(selected.id),
    getCuentasPorPagar(selected.id),
    getVenueCategories(selected.id),
  ]);

  const rows: CuentaPorPagarRow[] = cuentas.map((c) => ({
    id: c.id,
    date: c.date.toISOString().slice(0, 10),
    concept: c.concept,
    amount: Number(c.amount),
    supplier: c.supplier,
    paymentMethod: c.paymentMethod,
  }));

  const propinaRows: PropinaRow[] = propinasPorCorte.map((p) => ({
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    amount: p.amount,
    paid: p.paid,
    folioCorteZ: p.folioCorteZ,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Por pagar</h1>
        <p className="text-sm text-muted-foreground">Propinas y otras deudas pendientes.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Propinas pendientes"
          value={formatMXN(propinasPendientes)}
          hint={`Suma de cortes con propina sin marcar como pagada`}
          tone="negative"
          icon={<HandCoins className="h-4 w-4" />}
        />
        <div className="card flex flex-col justify-center p-5">
          <p className="text-xs text-muted-foreground">
            Cada corte con propina aparece abajo como un renglón — márcalo &ldquo;Pagado&rdquo; en
            cuanto se le entregue en efectivo al personal, aunque sea de un corte de días
            anteriores.
          </p>
        </div>
      </section>

      <PropinasPorCorteManager rows={propinaRows} />

      {/* "Otros" (deudas puntuales) es sólo para quien administra el negocio;
          Cajero puede marcar propinas pero no crear/editar/borrar estas cuentas. */}
      {user.role !== "CAJERO" && (
        <CuentasPorPagarManager venueId={selected.id} rows={rows} categories={categories.EGRESO} />
      )}
    </div>
  );
}
