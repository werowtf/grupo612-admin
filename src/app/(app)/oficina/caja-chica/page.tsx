import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getOficinaCajaChica } from "@/lib/oficina/queries";
import { DEFAULT_EGRESO_CATEGORIES } from "@/lib/entries/config";
import { CajaChicaManager, type FondoRow, type GastoRow } from "@/components/caja-chica-manager";

export default async function OficinaCajaChicaPage() {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();

  const { resumen, fondos, gastos } = await getOficinaCajaChica();

  const fondoRows: FondoRow[] = fondos.map((f) => ({
    id: f.id,
    date: f.date.toISOString().slice(0, 10),
    amount: Number(f.amount),
    notes: f.notes,
  }));
  const gastoRows: GastoRow[] = gastos.map((g) => ({
    id: g.id,
    date: g.date.toISOString().slice(0, 10),
    amount: Number(g.amount),
    category: g.category,
    employee: g.employee,
    description: g.description,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Caja Chica</h1>
        <p className="text-sm text-muted-foreground">
          Caja chica propia de Oficina, independiente de la de los negocios.
        </p>
      </header>

      <CajaChicaManager
        scope="oficina"
        venueId=""
        resumen={resumen}
        fondos={fondoRows}
        gastos={gastoRows}
        categories={[...DEFAULT_EGRESO_CATEGORIES]}
      />
    </div>
  );
}
