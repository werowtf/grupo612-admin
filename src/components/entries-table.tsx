import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { FinancialEntry, EntryType, PaymentMethod } from "@/generated/prisma/client";
import { paymentLabels, egresoCategoryBadgeClass } from "@/lib/entries/config";
import { formatMXN, formatDate, diaSemana, cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  type: EntryType;
  rows: FinancialEntry[];
  hrefBase?: string; // p.ej. "/ingresos-egresos" para enlazar al detalle
  emptyText?: string;
}

// Las 4 formas de pago del libro contable; "Otro" sólo aparece si algún
// movimiento del mes realmente la usa, para no meter una columna vacía.
const EGRESO_PAYMENT_COLS: PaymentMethod[] = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CHEQUE"];

export function EntriesTable({ type, rows, hrefBase, emptyText }: Props) {
  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted-foreground">
        {emptyText ?? "No hay movimientos."}
      </div>
    );
  }

  return type === "EGRESO" ? (
    <EgresosTable rows={rows} hrefBase={hrefBase} />
  ) : (
    <IngresosTable rows={rows} hrefBase={hrefBase} />
  );
}

function dateCell(e: FinancialEntry, hrefBase?: string) {
  return hrefBase ? (
    <Link href={`${hrefBase}/${e.id}`} className="font-semibold text-brand-600 hover:underline">
      {formatDate(e.date)}
    </Link>
  ) : (
    <span className="font-semibold">{formatDate(e.date)}</span>
  );
}

function IngresosTable({ rows, hrefBase }: { rows: FinancialEntry[]; hrefBase?: string }) {
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Categoría</th>
              <th className="px-3 py-2 font-semibold">Origen</th>
              <th className="px-3 py-2 font-semibold">Pago</th>
              <th className="px-3 py-2 font-semibold">Folio</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-muted/60">
                <td className="whitespace-nowrap px-3 py-2">{dateCell(e, hrefBase)}</td>
                <td className="px-3 py-2">{e.category}</td>
                <td className="max-w-[200px] px-3 py-2 text-muted-foreground">
                  {e.supplier ? (
                    <Tooltip>
                      <TooltipTrigger className="block max-w-full truncate text-left">
                        {e.supplier}
                      </TooltipTrigger>
                      <TooltipContent>{e.supplier}</TooltipContent>
                    </Tooltip>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{paymentLabels[e.paymentMethod]}</td>
                <td className="px-3 py-2 text-muted-foreground">{e.folio ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-abono">
                  +{formatMXN(e.amount)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{e.photoMime && <ImageIcon className="h-4 w-4" />}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-table-header/60">
              <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-abono">{formatMXN(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function EgresosTable({ rows, hrefBase }: { rows: FinancialEntry[]; hrefBase?: string }) {
  const hasOtro = rows.some((e) => e.paymentMethod === "OTRO");
  const cols = hasOtro ? ([...EGRESO_PAYMENT_COLS, "OTRO"] as PaymentMethod[]) : EGRESO_PAYMENT_COLS;
  const totals = Object.fromEntries(cols.map((m) => [m, 0])) as Record<PaymentMethod, number>;
  for (const e of rows) {
    if (e.paymentMethod in totals) totals[e.paymentMethod] += Number(e.amount);
  }
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Día</th>
              <th className="px-3 py-2 font-semibold">Categoría</th>
              {cols.map((m) => (
                <th key={m} className="px-3 py-2 text-right font-semibold">{paymentLabels[m]}</th>
              ))}
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => (
              <tr key={e.id} className="hover:bg-muted/60">
                <td className="whitespace-nowrap px-3 py-2">{dateCell(e, hrefBase)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{diaSemana(e.date)}</td>
                <td className="px-3 py-2">
                  <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", egresoCategoryBadgeClass(e.category))}>
                    {e.category}
                  </span>
                </td>
                {cols.map((m) => (
                  <td key={m} className="px-3 py-2 text-right tabular-nums">
                    {e.paymentMethod === m ? (
                      <span className="font-semibold text-cargo">−{formatMXN(e.amount)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-muted-foreground">{e.photoMime && <ImageIcon className="h-4 w-4" />}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-table-header/60 font-semibold">
              <td colSpan={3} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </td>
              {cols.map((m) => (
                <td key={m} className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(totals[m])}</td>
              ))}
              <td></td>
            </tr>
            <tr className="border-t border-border bg-table-header/60">
              <td colSpan={2 + cols.length} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total general
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
