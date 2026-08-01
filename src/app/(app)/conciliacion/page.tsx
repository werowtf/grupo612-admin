import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppContext, getVenueBankAccounts } from "@/lib/context";
import { getVenueStatements, getVenueTransactions } from "@/lib/queries";
import { ImportForm } from "@/components/import-form";
import { TransactionsTable } from "@/components/transactions-table";
import { toTxRow } from "@/lib/serialize";
import { formatDate, formatMXN } from "@/lib/utils";
import { bankLabels } from "@/lib/labels";
import { VenueTag } from "@/components/venue-tag";

export default async function ConciliacionPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-[var(--color-muted)]">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const [accounts, statements, recent] = await Promise.all([
    getVenueBankAccounts(selected.id),
    getVenueStatements(selected.id),
    getVenueTransactions(selected.id, { take: 25 }),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Conciliación bancaria</h1>
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
          <VenueTag name={selected.name} /> importa y clasifica los movimientos bancarios
        </p>
      </header>

      <ImportForm
        accounts={accounts.map((a) => ({ id: a.id, alias: a.alias, bank: a.bank }))}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Estados de cuenta importados</h2>
        {statements.length === 0 ? (
          <div className="card p-6 text-sm text-[var(--color-muted)]">
            Todavía no has importado estados de cuenta.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-gray-50 text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                    <th className="px-3 py-2 font-medium">Archivo</th>
                    <th className="px-3 py-2 font-medium">Banco</th>
                    <th className="px-3 py-2 font-medium">Periodo</th>
                    <th className="px-3 py-2 text-right font-medium">Movs.</th>
                    <th className="px-3 py-2 text-right font-medium">Abonos</th>
                    <th className="px-3 py-2 text-right font-medium">Cargos</th>
                    <th className="px-3 py-2 font-medium">Importado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {statements.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="max-w-[240px] px-3 py-2">
                        <span className="line-clamp-1 font-medium">{s.fileName}</span>
                      </td>
                      <td className="px-3 py-2">{bankLabels[s.bank]}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted)]">
                        {s.periodStart && s.periodEnd
                          ? `${formatDate(s.periodStart)} – ${formatDate(s.periodEnd)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.importedCount}
                        {s.duplicateCount > 0 && (
                          <span className="ml-1 text-xs text-[var(--color-muted)]">
                            (+{s.duplicateCount} dup)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-brand-600">
                        {formatMXN(s.totalAbonos)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-[var(--color-danger)]">
                        {formatMXN(s.totalCargos)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted)]">
                        {formatDate(s.createdAt)}
                        {s.importedBy?.name ? ` · ${s.importedBy.name}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {recent.total > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Movimientos recientes</h2>
            <Link
              href="/movimientos"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:underline"
            >
              Ver todos ({recent.total}) <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <TransactionsTable rows={recent.rows.map(toTxRow)} />
        </section>
      )}
    </div>
  );
}
