import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOficinaCajaChica, PERIODO_INICIAL, type PeriodoSegmento } from "@/lib/oficina/queries";
import { DEFAULT_EGRESO_CATEGORIES } from "@/lib/entries/config";
import { CajaChicaManager, type FondoRow, type GastoRow } from "@/components/caja-chica-manager";
import { OficinaPeriodoBar } from "@/components/oficina-periodo-bar";

const fmt = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dayBefore = (d: Date) => new Date(d.getTime() - 24 * 60 * 60 * 1000);

/** Texto de cada periodo en el selector. */
function label(s: PeriodoSegmento, hayPeriodos: boolean): string {
  if (s.key === PERIODO_INICIAL) {
    return hayPeriodos && s.end ? `Anterior · hasta ${fmt(dayBefore(s.end))}` : "Todo el historial";
  }
  if (s.vigente) return `Vigente · desde ${fmt(s.start!)}`;
  return `${fmt(s.start!)} – ${fmt(dayBefore(s.end!))}`;
}

export default async function OficinaCajaChicaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();
  const sp = await searchParams;

  const [{ segmentos, seleccionado, resumen, fondos, gastos }, venues] = await Promise.all([
    getOficinaCajaChica(sp.periodo),
    prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const hayPeriodos = segmentos.length > 1;
  const vigenteSeg = segmentos[0];
  const options = segmentos.map((s) => ({ key: s.key, label: label(s, hayPeriodos) }));
  const current = vigenteSeg.id && vigenteSeg.fondoFijo != null
    ? {
        id: vigenteSeg.id,
        startDate: vigenteSeg.start!.toISOString().slice(0, 10),
        fondoFijo: vigenteSeg.fondoFijo,
        notes: vigenteSeg.notes,
        label: `desde ${fmt(vigenteSeg.start!)}`,
      }
    : null;

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
    reimbursed: g.reimbursed,
    venueId: g.venueId,
    venueName: g.venue?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Caja Chica</h1>
        <p className="text-sm text-muted-foreground">
          Caja chica propia de Oficina, independiente de la de los negocios.
        </p>
      </header>

      <OficinaPeriodoBar
        options={options}
        selectedKey={seleccionado.key}
        vigenteKey={vigenteSeg.key}
        vigente={seleccionado.vigente}
        current={current}
      />

      <CajaChicaManager
        // Al cambiar de periodo se reinician los diálogos y el estado interno.
        key={seleccionado.key}
        scope="oficina"
        venueId=""
        resumen={resumen}
        fondos={fondoRows}
        gastos={gastoRows}
        categories={[...DEFAULT_EGRESO_CATEGORIES]}
        venues={venues}
        readOnly={!seleccionado.vigente}
        fixedFund={seleccionado.fondoFijo != null}
      />
    </div>
  );
}
