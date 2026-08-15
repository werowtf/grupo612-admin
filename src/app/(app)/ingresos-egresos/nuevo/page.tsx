import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { EntryForm } from "@/components/entry-form";

export default async function NuevoMovimientoPage() {
  const { selected } = await getAppContext();
  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ingresos-egresos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Ingresos y egresos
        </Link>
        <h1 className="mt-1 text-xl">Nuevo movimiento</h1>
      </div>

      <EntryForm
        venues={[{ id: selected.id, name: selected.name }]}
        defaultVenueId={selected.id}
        mode="full"
        redirectTo="/ingresos-egresos"
        initialValues={{ date: today }}
      />
    </div>
  );
}
