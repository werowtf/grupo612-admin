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
  "OTRO",
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
      <div className="card p-8 text-center text-sm text-[var(--color-muted)]">
        No hay movimientos que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-gray-50 text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Descripción</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 text-right font-medium">Cargo</th>
              <th className="px-3 py-2 text-right font-medium">Abono</th>
              <th className="px-3 py-2 font-medium">Estatus</th>
            </tr>
          </thead>
          <tbody className={cn("divide-y divide-[var(--color-border)]", pending && "opacity-60")}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/60">
                <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted)]">
                  <div>{formatDate(r.date)}</div>
                  {r.time && <div className="text-[11px]">{r.time}</div>}
                </td>
                <td className="max-w-[320px] px-3 py-2">
                  <span className="line-clamp-2">{r.description}</span>
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={r.category}
                    onValueChange={(value) => onCategory(r.id, value)}
                    disabled={pending}
                  >
                    <SelectTrigger
                      title={r.autoCategorized ? "Clasificación automática" : "Ajustada manualmente"}
                      className={cn(
                        "border bg-white px-2 py-1 text-xs text-[var(--color-fg)] hover:bg-gray-50",
                        r.autoCategorized
                          ? "border-dashed border-[var(--color-border)] text-[var(--color-muted)]"
                          : "border-[var(--color-border)] font-medium",
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabels[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {r.direction === "CARGO" ? (
                    <span className="text-[var(--color-danger)]">
                      {formatMXN(r.amount)}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  {r.direction === "ABONO" ? (
                    <span className="text-brand-600">{formatMXN(r.amount)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <Select
                    value={r.status}
                    onValueChange={(value) => onStatus(r.id, value)}
                    disabled={pending}
                  >
                    <SelectTrigger className="border border-[var(--color-border)] bg-white px-2 py-1 text-xs text-[var(--color-fg)] hover:bg-gray-50">
                      <SelectValue />
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
