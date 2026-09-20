import { getAppContext } from "@/lib/context";
import { getCajaChicaResumen, getCajaChicaFondos, getCajaChicaGastos } from "@/lib/caja-chica/queries";
import { getVenueCategories } from "@/lib/entries/queries";
import { CajaChicaManager, type FondoRow, type GastoRow } from "@/components/caja-chica-manager";

export default async function CajaChicaPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const [resumen, fondos, gastos, categories] = await Promise.all([
    getCajaChicaResumen(selected.id),
    getCajaChicaFondos(selected.id),
    getCajaChicaGastos(selected.id),
    getVenueCategories(selected.id),
  ]);

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
          Fondo para gastos menores: el administrador aprueba el monto y aquí se registra en qué se va gastando.
        </p>
      </header>

      <CajaChicaManager
        venueId={selected.id}
        resumen={resumen}
        fondos={fondoRows}
        gastos={gastoRows}
        categories={categories.EGRESO}
      />
    </div>
  );
}
