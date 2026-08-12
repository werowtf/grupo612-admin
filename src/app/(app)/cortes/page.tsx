import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatMXN, formatDate } from "@/lib/utils";
import { VenueTag } from "@/components/venue-tag";
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
      <div className="card p-10 text-center text-sm text-[var(--color-muted)]">
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
          <h1 className="text-xl font-semibold">Cortes de caja</h1>
          <p className="flex items-center gap-2 text-sm text-[var(--color-muted)]">
            <VenueTag name={selected.name} /> {cortes.length} corte{cortes.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/cortes/nuevo" className={buttonVariants()}>
          <Plus className="h-4 w-4" />
          Nuevo corte
        </Link>
      </header>

      {cortes.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <Receipt className="h-8 w-8 text-[var(--color-muted)]" />
          <p className="text-sm text-[var(--color-muted)]">
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
                <tr className="border-b border-[var(--color-border)] bg-muted/50 text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Turno</th>
                  <th className="px-3 py-2 font-medium">Folio Z</th>
                  <th className="px-3 py-2 text-right font-medium">Venta total</th>
                  <th className="px-3 py-2 text-right font-medium">Propinas</th>
                  <th className="px-3 py-2 text-right font-medium">Sobrante/Faltante</th>
                  <th className="px-3 py-2 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {cortes.map((c) => {
                  const sf = Number(c.sobranteFaltante.toString());
                  return (
                    <tr key={c.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2">
                        <Link href={`/cortes/${c.id}`} className="font-medium text-brand-700 hover:underline">
                          {formatDate(c.date)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-[var(--color-muted)]">{c.turno ?? "—"}</td>
                      <td className="px-3 py-2 text-[var(--color-muted)]">{c.folioCorteZ ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(c.totalVenta)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatMXN(c.totalPropinas)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${sf < 0 ? "text-[var(--color-danger)]" : sf > 0 ? "text-brand-600" : "text-[var(--color-muted)]"}`}>
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
