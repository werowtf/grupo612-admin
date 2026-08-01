import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EntryForm } from "@/components/entry-form";
import { EntriesTable } from "@/components/entries-table";

export default async function ComprasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const venues = await getAccessibleVenues(user);
  const today = new Date().toISOString().slice(0, 10);

  const recent = await prisma.financialEntry.findMany({
    where: { createdById: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Registrar compra</h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Captura la compra del día. Puedes tomar una <strong>foto del ticket</strong> para
          llenar los datos automáticamente, o escribirlos a mano.
        </p>
      </header>

      {venues.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
          No tienes negocios asignados. Contacta al administrador.
        </div>
      ) : (
        <EntryForm
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          defaultVenueId={venues[0].id}
          mode="compra"
          redirectTo="/compras"
          initialValues={{ date: today }}
        />
      )}

      <section>
        <h2 className="mb-3 text-base font-semibold">Mis compras registradas</h2>
        <EntriesTable rows={recent} emptyText="Todavía no has registrado compras." />
      </section>
    </div>
  );
}
