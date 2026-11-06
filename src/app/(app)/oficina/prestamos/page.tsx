import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrestamosManager, type PrestamoRow } from "@/components/prestamos-manager";

const TZ = "America/Mazatlan";

export default async function OficinaPrestamosPage() {
  const user = await getCurrentUser();
  if (!user?.canAccessOficina) notFound();

  const [venues, prestamos] = await Promise.all([
    prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.prestamoNegocio.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { lenderVenue: { select: { name: true } }, borrowerVenue: { select: { name: true } } },
      take: 500,
    }),
  ]);

  const rows: PrestamoRow[] = prestamos.map((p) => ({
    id: p.id,
    date: p.date.toISOString().slice(0, 10),
    lender: p.lenderVenue.name,
    borrower: p.borrowerVenue.name,
    amount: Number(p.amount),
    paymentMethod: p.paymentMethod,
    status: p.status,
    reimbursedAt: p.reimbursedAt ? p.reimbursedAt.toLocaleDateString("en-CA", { timeZone: TZ }) : null,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Préstamos</h1>
        <p className="text-sm text-muted-foreground">
          Préstamos de dinero entre los negocios de la plataforma. Cada préstamo y reembolso se refleja como ingreso y egreso en los negocios involucrados.
        </p>
      </header>

      <PrestamosManager venues={venues} rows={rows} />
    </div>
  );
}
