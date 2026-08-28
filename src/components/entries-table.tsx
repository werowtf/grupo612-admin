import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { FinancialEntry, EntryType } from "@/generated/prisma/client";
import { paymentLabels } from "@/lib/entries/config";
import { formatMXN, formatDate } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  type: EntryType;
  rows: FinancialEntry[];
  hrefBase?: string; // p.ej. "/ingresos-egresos" para enlazar al detalle
  emptyText?: string;
}

export function EntriesTable({ type, rows, hrefBase, emptyText }: Props) {
  const isEgreso = type === "EGRESO";
  const origenLabel = isEgreso ? "Proveedor" : "Origen";
  const total = rows.reduce((sum, e) => sum + Number(e.amount), 0);

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted-foreground">
        {emptyText ?? "No hay movimientos."}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Categoría</th>
              <th className="px-3 py-2 font-semibold">{origenLabel}</th>
              <th className="px-3 py-2 font-semibold">Pago</th>
              <th className="px-3 py-2 font-semibold">Folio</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => {
              const dateCell = hrefBase ? (
                <Link href={`${hrefBase}/${e.id}`} className="font-semibold text-brand-600 hover:underline">
                  {formatDate(e.date)}
                </Link>
              ) : (
                <span className="font-semibold">{formatDate(e.date)}</span>
              );
              return (
                <tr key={e.id} className="hover:bg-muted/60">
                  <td className="whitespace-nowrap px-3 py-2">{dateCell}</td>
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
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${isEgreso ? "text-cargo" : "text-abono"}`}>
                    {isEgreso ? "−" : "+"}
                    {formatMXN(e.amount)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {e.photoMime && <ImageIcon className="h-4 w-4" />}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-table-header/60">
              <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total
              </td>
              <td className={`px-3 py-2 text-right tabular-nums font-semibold ${isEgreso ? "text-cargo" : "text-abono"}`}>
                {formatMXN(total)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
