import { CheckCircle2, FileUp } from "lucide-react";
import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ImportForm } from "@/components/import-form";
import { bankLabels } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const venues = await getAccessibleVenues(user);
  const accounts = await prisma.bankAccount.findMany({
    where: { venueId: { in: venues.map((v) => v.id) } },
    include: { venue: { select: { name: true } } },
    orderBy: { alias: "asc" },
  });

  const statements = await prisma.bankStatement.findMany({
    where: { importedById: user.id },
    include: { bankAccount: { include: { venue: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Hola, {user.name.split(" ")[0]}</h1>
        <p className="mt-1 text-[var(--color-muted)]">
          Sube aquí los estados de cuenta mensuales de cada negocio. Selecciona la
          cuenta correspondiente y el archivo del banco; el sistema los registra al
          instante y queda constancia de cada envío.
        </p>
      </header>

      <ImportForm
        accounts={accounts.map((a) => ({
          id: a.id,
          alias: `${a.venue.name} — ${bankLabels[a.bank]}${a.accountNumber ? ` ·${a.accountNumber.slice(-4)}` : ""}`,
          bank: a.bank,
        }))}
      />

      <section>
        <h2 className="mb-3 text-base font-semibold">Estados de cuenta enviados</h2>
        {statements.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <FileUp className="h-7 w-7 text-[var(--color-muted)]" />
            <p className="text-sm text-[var(--color-muted)]">
              Aún no has enviado estados de cuenta. Los que subas aparecerán aquí como
              comprobante.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {statements.map((s) => (
              <li
                key={s.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-brand-600" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{s.fileName}</div>
                    <div className="text-xs text-[var(--color-muted)]">
                      {s.bankAccount.venue.name} · {bankLabels[s.bank]}
                      {s.periodStart && s.periodEnd
                        ? ` · ${formatDate(s.periodStart)} – ${formatDate(s.periodEnd)}`
                        : ""}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium tabular-nums">
                    {s.importedCount} movimientos
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">
                    Enviado {formatDate(s.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
