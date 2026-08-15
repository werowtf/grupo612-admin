import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getAppContext, getVenueBankAccounts } from "@/lib/context";
import { getVenueStatements, getVenueTransactions } from "@/lib/queries";
import { ImportForm } from "@/components/import-form";
import { TransactionsTable } from "@/components/transactions-table";
import { toTxRow } from "@/lib/serialize";
import { formatDate, formatMXN } from "@/lib/utils";
import { bankLabels } from "@/lib/labels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default async function ConciliacionPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
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
        <h1 className="text-xl">Estados de cuenta</h1>
        <p className="text-sm text-muted-foreground">
          Sube y administra los estados de cuenta bancarios
        </p>
      </header>

      <ImportForm
        accounts={accounts.map((a) => ({ id: a.id, alias: a.alias, bank: a.bank }))}
      />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Estados de cuenta importados</h2>
        {statements.length === 0 ? (
          <div className="card p-6 text-sm text-muted-foreground">
            Todavía no has importado estados de cuenta.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-700">
                    <th className="px-3 py-2 font-semibold">Archivo</th>
                    <th className="px-3 py-2 font-semibold">Banco</th>
                    <th className="px-3 py-2 font-semibold">Periodo</th>
                    <th className="px-3 py-2 text-right font-semibold">Movs.</th>
                    <th className="px-3 py-2 text-right font-semibold">Abonos</th>
                    <th className="px-3 py-2 text-right font-semibold">Cargos</th>
                    <th className="px-3 py-2 font-semibold">Importado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {statements.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/60">
                      <td className="max-w-[240px] px-3 py-2">
                        <Tooltip>
                          <TooltipTrigger className="block max-w-full truncate text-left font-medium">
                            {s.fileName}
                          </TooltipTrigger>
                          <TooltipContent>{s.fileName}</TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-3 py-2">{bankLabels[s.bank]}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {s.periodStart && s.periodEnd
                          ? `${formatDate(s.periodStart)} – ${formatDate(s.periodEnd)}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.importedCount}
                        {s.duplicateCount > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (+{s.duplicateCount} dup)
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-abono">
                        {formatMXN(s.totalAbonos)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-cargo">
                        {formatMXN(s.totalCargos)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
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
              className="inline-flex items-center gap-1 text-sm text-brand-500 hover:underline"
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
