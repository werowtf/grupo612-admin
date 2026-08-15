import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { FinancialEntry } from "@/generated/prisma/client";
import { entryTypeLabels, paymentLabels } from "@/lib/entries/config";
import { formatMXN, formatDate } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  rows: FinancialEntry[];
  hrefBase?: string; // p.ej. "/ingresos-egresos" para enlazar al detalle
  emptyText?: string;
}

export function EntriesTable({ rows, hrefBase, emptyText }: Props) {
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
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-700">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Categoría</th>
              <th className="px-3 py-2 font-semibold">Proveedor / origen</th>
              <th className="px-3 py-2 font-semibold">Pago</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((e) => {
              const isEgreso = e.type === "EGRESO";
              const dateCell = hrefBase ? (
                <Link href={`${hrefBase}/${e.id}`} className="font-medium text-brand-700 hover:underline">
                  {formatDate(e.date)}
                </Link>
              ) : (
                <span className="font-medium">{formatDate(e.date)}</span>
              );
              return (
                <tr key={e.id} className="hover:bg-muted/60">
                  <td className="whitespace-nowrap px-3 py-2">{dateCell}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        isEgreso ? "bg-rose-50 text-rose-700" : "bg-brand-50 text-brand-700"
                      }`}
                    >
                      {entryTypeLabels[e.type]}
                    </span>
                  </td>
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
                  <td className={`px-3 py-2 text-right tabular-nums font-medium ${isEgreso ? "text-cargo" : "text-abono"}`}>
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
        </table>
      </div>
    </div>
  );
}
