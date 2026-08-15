"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateTransactionCategory,
  updateTransactionStatus,
} from "@/app/(app)/conciliacion/actions";
import { categoryLabels, statusLabels } from "@/lib/labels";
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
  direction: TxDirection;
  amount: number;
  category: TxCategory;
  status: TxStatus;
  autoCategorized: boolean;
}

const CATEGORIES: TxCategory[] = [
  "DEPOSITO",
  "TRANSFERENCIA",
  "CHEQUE",
  "COMISION",
  "GASTO_TARJETA",
];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

export function TransactionsTable({ rows }: { rows: TxRow[] }) {
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
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-700">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="px-3 py-2 font-semibold">Descripción</th>
              {CATEGORIES.map((c) => (
                <th key={c} className="px-3 py-2 text-right font-medium">
                  {categoryLabels[c]}
                </th>
              ))}
              <th className="px-3 py-2 font-semibold">Estatus</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-border", pending && "opacity-60")}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/60">
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  <div>{formatDate(r.date)}</div>
                  {r.time && <div className="text-[11px]">{r.time}</div>}
                </td>
                <td className="max-w-[320px] px-3 py-2">
                  <Tooltip>
                    <TooltipTrigger className="block max-w-full truncate text-left">
                      {r.description}
                    </TooltipTrigger>
                    <TooltipContent>{r.description}</TooltipContent>
                  </Tooltip>
                </td>
                {CATEGORIES.map((c) =>
                  c === r.category ? (
                    <td key={c} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                      <Select
                        value={r.category}
                        onValueChange={(value) => onCategory(r.id, value)}
                        disabled={pending}
                      >
                        <SelectTrigger
                          hideIcon
                          title={r.autoCategorized ? "Clasificación automática" : "Ajustada manualmente"}
                          className={cn(
                            "ml-auto justify-end border-0 bg-transparent px-1.5 py-1 text-sm font-medium hover:bg-muted",
                            r.direction === "CARGO" ? "text-cargo" : "text-abono",
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
                    <td key={c} className="px-3 py-2 text-right text-gray-300">—</td>
                  ),
                )}
                <td className="px-3 py-2">
                  <Select
                    value={r.status}
                    onValueChange={(value) => onStatus(r.id, value)}
                    disabled={pending}
                  >
                    <SelectTrigger className="border border-transparent bg-field-bg px-2 py-1 text-xs text-foreground hover:bg-muted/50">
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
        </table>
      </div>
    </div>
  );
}
