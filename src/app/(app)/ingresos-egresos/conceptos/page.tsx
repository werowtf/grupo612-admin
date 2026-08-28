import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { EntryCategoriesManager, type CategoryRow } from "@/components/entry-categories-manager";
import type { EntryType, UserRole } from "@/generated/prisma/enums";

const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

export default async function ConceptosPage() {
  const { user, selected } = await getAppContext();
  if (!PUEDEN_EDITAR.includes(user.role)) notFound();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const [categories, usos] = await Promise.all([
    prisma.entryCategory.findMany({
      where: { venueId: selected.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    // Cuántos movimientos usa cada concepto, para avisar antes de renombrar y
    // para permitir borrar sólo los que no tienen histórico.
    prisma.financialEntry.groupBy({
      by: ["type", "category"],
      where: { venueId: selected.id },
      _count: { _all: true },
    }),
  ]);

  const conteo = new Map(usos.map((u) => [`${u.type}|${u.category}`, u._count._all]));
  const rowsFor = (type: EntryType): CategoryRow[] =>
    categories
      .filter((c) => c.type === type)
      .map((c) => ({
        id: c.id,
        name: c.name,
        active: c.active,
        usos: conteo.get(`${type}|${c.name}`) ?? 0,
      }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/ingresos-egresos"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Ingresos y egresos
        </Link>
        <h1 className="mt-1 text-xl">Conceptos de {selected.name}</h1>
        <p className="text-sm text-muted-foreground">
          Cada negocio maneja su propia lista. Los cambios aplican solo a {selected.name}; para otro
          negocio, cámbialo en el menú de arriba.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EntryCategoriesManager
          venueId={selected.id}
          type="EGRESO"
          title="Egresos"
          hint="Conceptos de gasto: compras, nómina, servicios…"
          rows={rowsFor("EGRESO")}
        />
        <EntryCategoriesManager
          venueId={selected.id}
          type="INGRESO"
          title="Ingresos"
          hint="Conceptos de entrada: venta diaria, covers…"
          rows={rowsFor("INGRESO")}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Desactivar un concepto lo quita del selector al capturar, pero conserva los movimientos que
        ya lo usan. Solo se pueden borrar los conceptos sin movimientos.
      </p>
    </div>
  );
}
