import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatMXN, formatDate } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const sourceLabels: Record<string, string> = {
  MANUAL: "Manual",
  EXCEL: "Excel",
  OCR: "Foto",
};

export default async function CortesPage() {
  const { selected } = await getAppContext();

  if (!selected) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Tu usuario no tiene negocios asignados.
      </div>
    );
  }

  const cortes = await prisma.corte.findMany({
    where: { venueId: selected.id },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Cortes de caja</h1>
          <p className="text-sm text-muted-foreground">
            {cortes.length} corte{cortes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/cortes/nuevo" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nuevo corte
        </Link>
      </header>

      {cortes.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no hay cortes de caja. Sube el Excel de Soft Restaurant, una foto del
            ticket, o captúralo manualmente.
          </p>
          <Link href="/cortes/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo corte
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="px-3 py-2 font-semibold">Fecha</th>
                  <th className="px-3 py-2 font-semibold">Turno</th>
                  <th className="px-3 py-2 font-semibold">Folio Z</th>
                  <th className="px-3 py-2 text-right font-semibold">Venta total</th>
                  <th className="px-3 py-2 text-right font-semibold">Propinas</th>
                  <th className="px-3 py-2 text-right font-semibold">Sobrante/Faltante</th>
                  <th className="px-3 py-2 font-semibold">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {cortes.map((c) => {
                  const sf = Number(c.sobranteFaltante.toString());
                  return (
                    <tr key={c.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link href={`/cortes/${c.id}`} className="font-semibold text-brand-600 hover:underline">
                          {formatDate(c.date)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.turno ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.folioCorteZ ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-abono">{formatMXN(c.totalVenta)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-chart-3">{formatMXN(c.totalPropinas)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${sf < 0 ? "text-danger" : sf > 0 ? "text-brand-600" : "text-muted-foreground"}`}>
                        {formatMXN(sf)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {sourceLabels[c.source] ?? c.source}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
