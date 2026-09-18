import { getAppContext, getVenueBankAccounts } from "@/lib/context";
import { getVenueStatements } from "@/lib/queries";
import { ImportForm } from "@/components/import-form";
import { StatementRows } from "@/components/statement-rows";
import { MonthPicker } from "@/components/month-picker";
import { Button } from "@/components/ui/button";

function parseMonth(mes: string | undefined): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

export default async function ConciliacionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { selected } = await getAppContext();
  const sp = await searchParams;

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const { year, month } = parseMonth(sp.mes);
  const mesValue = `${year}-${String(month).padStart(2, "0")}`;

  const [accounts, statements] = await Promise.all([
    getVenueBankAccounts(selected.id),
    getVenueStatements(selected.id, year, month),
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-base font-semibold">Estados de cuenta importados</h2>
          <form method="get" className="flex items-center gap-2">
            <MonthPicker name="mes" defaultValue={mesValue} />
            <Button type="submit" variant="outline" size="sm">Ver</Button>
          </form>
        </div>
        {statements.length === 0 ? (
          <div className="card p-6 text-sm text-muted-foreground">
            No hay estados de cuenta importados este mes.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                    <th className="px-3 py-2 font-semibold">Archivo</th>
                    <th className="px-3 py-2 font-semibold">Banco</th>
                    <th className="px-3 py-2 font-semibold">Periodo</th>
                    <th className="px-3 py-2 text-right font-semibold">Movimientos</th>
                    <th className="px-3 py-2 text-right font-semibold">Abonos</th>
                    <th className="px-3 py-2 text-right font-semibold">Cargos</th>
                    <th className="px-3 py-2 font-semibold">Importado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <StatementRows
                    statements={statements.map((s) => ({
                      id: s.id,
                      fileName: s.fileName,
                      bank: s.bank,
                      periodStart: s.periodStart?.toISOString() ?? null,
                      periodEnd: s.periodEnd?.toISOString() ?? null,
                      importedCount: s.importedCount,
                      duplicateCount: s.duplicateCount,
                      totalAbonos: Number(s.totalAbonos.toString()),
                      totalCargos: Number(s.totalCargos.toString()),
                      createdAt: s.createdAt.toISOString(),
                      importedByName: s.importedBy?.name ?? null,
                    }))}
                  />
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
