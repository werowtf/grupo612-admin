"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateTransactionCategory,
  updateTransactionStatus,
} from "@/app/(app)/conciliacion/actions";
import { categoryLabels, categoryText, statusLabels } from "@/lib/labels";
import { formatMXN, formatDate, cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type {
  TxCategory,
  TxStatus,
  TxDirection,
} from "@/generated/prisma/enums";

export interface TxRow {
  id: string;
  date: string; // ISO
  time: string | null;
  description: string;
  descriptionLong: string | null;
  direction: TxDirection;
  amount: number;
  category: TxCategory;
  status: TxStatus;
  autoCategorized: boolean;
}

const DEFAULT_CATEGORIES: TxCategory[] = [
  "DEPOSITO",
  "TRANSFERENCIA",
  "GASTO_TARJETA",
  "CHEQUE",
  "COMISION",
];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

export function TransactionsTable({
  rows,
  categoryOrder = DEFAULT_CATEGORIES,
  showTotals = false,
}: {
  rows: TxRow[];
  categoryOrder?: TxCategory[];
  showTotals?: boolean;
}) {
  const CATEGORIES = categoryOrder;
  const categoryTotals = CATEGORIES.map((c) =>
    rows.filter((r) => r.category === c).reduce((sum, r) => sum + r.amount, 0),
  );
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onCategory(id: string, value: string) {
    startTransition(async () => {
      await updateTransactionCategory(id, value);
      router.refresh();
    });
  }
  function onStatus(id: string, value: string) {
    startTransition(async () => {
      await updateTransactionStatus(id, value);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted-foreground">
        No hay movimientos que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-full text-sm sm:min-w-[1080px]">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
              <th className="px-2 py-2 font-semibold sm:px-3">Fecha</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">Hora</th>
              <th className="px-2 py-2 font-semibold sm:px-3">Descripción</th>
              {CATEGORIES.map((c) => (
                <th key={c} className="hidden px-3 py-2 text-right font-semibold sm:table-cell">
                  {categoryLabels[c]}
                </th>
              ))}
              <th className="px-2 py-2 text-right font-semibold sm:hidden">Cargo/Abono</th>
              <th className="hidden px-3 py-2 text-right font-semibold sm:table-cell">Estatus</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-border", pending && "opacity-60")}>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  "hover:bg-muted/60",
                  r.status === "PENDIENTE" && "bg-pending-bg hover:bg-pending-bg",
                )}
              >
                <td className="whitespace-nowrap px-2 py-2 font-semibold text-muted-foreground sm:px-3">{formatDate(r.date)}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-muted-foreground sm:table-cell">{r.time || "—"}</td>
                <td className="max-w-[120px] px-2 py-2 sm:max-w-[320px] sm:px-3">
                  <Tooltip>
                    <TooltipTrigger className="block max-w-full truncate text-left">
                      {r.description}
                    </TooltipTrigger>
                    <TooltipContent>{r.descriptionLong || r.description}</TooltipContent>
                  </Tooltip>
                </td>
                {CATEGORIES.map((c) =>
                  c === r.category ? (
                    <td key={c} className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums sm:table-cell">
                      <Select
                        value={r.category}
                        onValueChange={(value) => onCategory(r.id, value)}
                        disabled={pending}
                      >
                        <SelectTrigger
                          hideIcon
                          title={r.autoCategorized ? "Clasificación automática" : "Ajustada manualmente"}
                          className={cn(
                            "ml-auto justify-end border-0 bg-transparent px-1.5 py-1 text-sm font-semibold hover:bg-muted",
                            c === "COMISION"
                              ? categoryText[r.category]
                              : r.direction === "CARGO" ? "text-cargo" : "text-abono",
                          )}
                        >
                          <SelectValue>{formatMXN(r.amount)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {categoryLabels[opt]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  ) : (
                    <td key={c} className="hidden px-3 py-2 text-right text-muted-foreground/40 sm:table-cell">—</td>
                  ),
                )}
                <td
                  className={cn(
                    "whitespace-nowrap px-2 py-2 text-right font-semibold tabular-nums sm:hidden",
                    r.direction === "CARGO" ? "text-cargo" : "text-abono",
                  )}
                >
                  {formatMXN(r.amount)}
                </td>
                <td className="hidden px-3 py-2 text-right sm:table-cell">
                  <Select
                    value={r.status}
                    onValueChange={(value) => onStatus(r.id, value)}
                    disabled={pending}
                  >
                    <SelectTrigger className="ml-auto border border-transparent bg-field-bg px-2 py-1 text-xs text-foreground hover:bg-muted/50">
                      <SelectValue>{statusLabels[r.status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {statusLabels[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
          </tbody>
          {showTotals && (
            <tfoot>
              <tr className="border-t border-border bg-table-header font-semibold">
                <td className="px-2 py-2 sm:px-3">Total</td>
                <td className="hidden px-3 py-2 sm:table-cell" />
                <td className="px-2 py-2 text-xs font-normal text-muted-foreground sm:px-3">
                  {rows.length} mov.
                </td>
                {CATEGORIES.map((c, i) => (
                  <td
                    key={c}
                    className={cn(
                      "hidden whitespace-nowrap px-3 py-2 text-right tabular-nums sm:table-cell",
                      c === "COMISION" ? categoryText[c] : undefined,
                    )}
                  >
                    {categoryTotals[i] !== 0 ? formatMXN(categoryTotals[i]) : "—"}
                  </td>
                ))}
                <td className="px-2 py-2 text-right tabular-nums sm:hidden">
                  {formatMXN(rows.reduce((sum, r) => sum + r.amount, 0))}
                </td>
                <td className="hidden px-3 py-2 sm:table-cell" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
