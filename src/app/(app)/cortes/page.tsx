import Link from "next/link";
import { Plus, Receipt } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatMXN, formatDate } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CortesMonthNav } from "@/components/cortes-month-nav";

const sourceLabels: Record<string, string> = {
  MANUAL: "Manual",
  EXCEL: "Excel",
  OCR: "Foto",
};

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ymd = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

export default async function CortesPage({
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

  if (selected.slug === "comisariato") {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        Cortes de caja no aplica para Comisariato. Cambia de negocio en el menú de arriba.
      </div>
    );
  }

  // Se pagina por mes. Sin `mes`, el del corte más reciente (si no hay cortes este mes, no abre vacío).
  const latest = await prisma.corte.findFirst({
    where: { venueId: selected.id },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(sp.mes ?? "");
  const base = m ? { year: Number(m[1]), month: Number(m[2]) } : latest
    ? { year: latest.date.getUTCFullYear(), month: latest.date.getUTCMonth() + 1 }
    : { year: new Date().getUTCFullYear(), month: new Date().getUTCMonth() + 1 };
  const { year, month } = base;
  const prev = month === 1 ? ymd(year - 1, 12) : ymd(year, month - 1);
  const nextYm = month === 12 ? ymd(year + 1, 1) : ymd(year, month + 1);
  const now = new Date();
  const currentYm = ymd(now.getUTCFullYear(), now.getUTCMonth() + 1);
  const lastYm = latest && ymd(latest.date.getUTCFullYear(), latest.date.getUTCMonth() + 1) > currentYm
    ? ymd(latest.date.getUTCFullYear(), latest.date.getUTCMonth() + 1)
    : currentYm;
  const next = nextYm <= lastYm ? nextYm : null;

  const cortes = await prisma.corte.findMany({
    where: {
      venueId: selected.id,
      date: { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) },
    },
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl">Cortes de Caja</h1>
          <p className="text-sm text-muted-foreground">
            <span className="capitalize">{MONTH_NAMES[month - 1]}</span> {year} · {cortes.length} corte{cortes.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CortesMonthNav value={ymd(year, month)} prev={prev} next={next} />
          <Link href="/cortes/nuevo" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Nuevo corte
          </Link>
        </div>
      </header>

      {!latest ? (
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
      ) : cortes.length === 0 ? (
        <div className="card p-10 text-center text-sm text-muted-foreground">
          No hay cortes en <span>{MONTH_NAMES[month - 1]}</span> {year}.
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
                        <Link href={`/cortes/${c.id}`} prefetch={false} className="font-semibold text-brand-600 hover:underline">
                          {formatDate(c.date)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{c.turno ?? "—"}</td>
                      <td className="px-3 py-2 font-semibold text-muted-foreground">{c.folioCorteZ ?? "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-abono">{formatMXN(c.totalVenta)}</td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums text-chart-3">{formatMXN(c.totalPropinas)}</td>
                      <td className={`px-3 py-2 text-right font-semibold tabular-nums ${sf < 0 ? "text-danger" : sf > 0 ? "text-brand-600" : "text-muted-foreground"}`}>
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
