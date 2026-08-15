import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EntryForm } from "@/components/entry-form";
import { formatDate } from "@/lib/utils";

export default async function EditarMovimientoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const entry = await prisma.financialEntry.findUnique({
    where: { id },
    include: { venue: true },
  });
  if (!entry) notFound();
  const hasAccess = user.role === "ADMIN" || user.venues.some((uv) => uv.venueId === entry.venueId);
  if (!hasAccess) notFound();

  const initialValues: Record<string, string> = {
    venueId: entry.venueId,
    date: entry.date.toISOString().slice(0, 10),
    amount: entry.amount.toString(),
    category: entry.category,
    paymentMethod: entry.paymentMethod,
    supplier: entry.supplier ?? "",
    folio: entry.folio ?? "",
    rfc: entry.rfc ?? "",
    reference: entry.reference ?? "",
    description: entry.description ?? "",
    notes: entry.notes ?? "",
    source: entry.source,
  };

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/ingresos-egresos/${entry.id}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Volver al movimiento
        </Link>
        <h1 className="mt-1 text-xl">Editar movimiento · {formatDate(entry.date)}</h1>
        <p className="text-sm text-muted-foreground">{entry.venue.name}</p>
      </div>

      <EntryForm
        venues={[{ id: entry.venueId, name: entry.venue.name }]}
        defaultVenueId={entry.venueId}
        mode="full"
        redirectTo={`/ingresos-egresos/${entry.id}`}
        entryId={entry.id}
        initialValues={initialValues}
        initialType={entry.type}
      />
    </div>
  );
}
