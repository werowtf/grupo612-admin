import { HandCoins } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getPropinasPendientes, getCuentasPorPagar } from "@/lib/por-pagar/queries";
import { CuentasPorPagarManager, type CuentaPorPagarRow } from "@/components/cuentas-por-pagar-manager";
import { StatCard } from "@/components/stat-card";
import { formatMXN } from "@/lib/utils";

export default async function PorPagarPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const [propinasPendientes, cuentas] = await Promise.all([
    getPropinasPendientes(selected.id),
    getCuentasPorPagar(selected.id),
  ]);

  const rows: CuentaPorPagarRow[] = cuentas.map((c) => ({
    id: c.id,
    date: c.date.toISOString().slice(0, 10),
    concept: c.concept,
    amount: Number(c.amount),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Por pagar</h1>
        <p className="text-sm text-muted-foreground">
          Propinas y otras deudas pendientes de {selected.name}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Propinas"
          value={formatMXN(propinasPendientes)}
          hint={`Suma de "Propinas por pagar" de todos los cortes de caja`}
          tone="negative"
          icon={<HandCoins className="h-4 w-4" />}
        />
        <div className="card flex flex-col justify-center p-5">
          <p className="text-xs text-muted-foreground">
            Este total viene del campo &ldquo;Propinas por pagar&rdquo; que se captura en cada
            corte de caja. Todavía no hay una forma de saldarlo aquí — corrígelo desde el corte si
            hace falta.
          </p>
        </div>
      </section>

      <CuentasPorPagarManager venueId={selected.id} rows={rows} />
    </div>
  );
}
