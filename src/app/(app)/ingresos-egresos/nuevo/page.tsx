import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { getVenueCategories } from "@/lib/entries/queries";
import { EntryForm } from "@/components/entry-form";

export default async function NuevoMovimientoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { selected } = await getAppContext();
  const sp = await searchParams;
  // Desde /ingresos o /egresos llega ?tipo=: preselecciona el tipo y regresa a esa sección.
  const tipo = sp.tipo === "INGRESO" ? "INGRESO" : "EGRESO";
  const backHref = tipo === "INGRESO" ? "/ingresos" : "/egresos";
  const backLabel = tipo === "INGRESO" ? "Ingresos" : "Egresos";
  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  const categories = await getVenueCategories(selected.id);

  return (
    <div className="space-y-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="mt-1 text-xl">{tipo === "INGRESO" ? "Nuevo ingreso" : "Nuevo egreso"}</h1>
      </div>

      <EntryForm
        venues={[{ id: selected.id, name: selected.name }]}
        defaultVenueId={selected.id}
        categories={categories}
        mode="full"
        redirectTo={backHref}
        initialType={tipo}
        initialValues={
          selected.slug === "comisariato"
            ? { date: today, paymentMethod: "TRANSFERENCIA" }
            : { date: today }
        }
      />
    </div>
  );
}
