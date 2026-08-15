import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { CorteEditor } from "@/components/corte-editor";
import { VenueTag } from "@/components/venue-tag";

export default async function NuevoCortePage() {
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
        <Link
          href="/cortes"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--color-fg)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Cortes de caja
        </Link>
        <h1 className="mt-1 text-xl">Nuevo corte de caja</h1>
        <p className="text-sm text-muted-foreground"><VenueTag name={selected.name} /></p>
      </div>

      <CorteEditor
        venueId={selected.id}
        venueName={selected.name}
        initialValues={{ date: today }}
      />
    </div>
  );
}
