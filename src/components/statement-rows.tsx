"use client";

import { Fragment, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { getStatementTransactionsAction } from "@/app/(app)/conciliacion/actions";
import { TransactionsTable, type TxRow } from "@/components/transactions-table";
import { formatDate, formatMXN, cn } from "@/lib/utils";
import { bankLabels } from "@/lib/labels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Bank, TxCategory } from "@/generated/prisma/enums";

const STATEMENT_CATEGORY_ORDER: TxCategory[] = [
  "DEPOSITO",
  "COMISION",
  "GASTO_TARJETA",
  "TRANSFERENCIA",
  "CHEQUE",
];

export interface StatementRow {
  id: string;
  fileName: string;
  bank: Bank;
  periodStart: string | null;
  periodEnd: string | null;
  importedCount: number;
  duplicateCount: number;
  totalAbonos: number;
  totalCargos: number;
  createdAt: string;
  importedByName: string | null;
}

export function StatementRows({ statements }: { statements: StatementRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [rows, setRows] = useState<TxRow[] | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    if (openId === id) {
      setOpenId(null);
      setRows(null);
      return;
    }
    setOpenId(id);
    setRows(null);
    startTransition(async () => {
      const data = await getStatementTransactionsAction(id);
      setRows(data);
    });
  }

  return (
    <>
      {statements.map((s) => (
        <Fragment key={s.id}>
          <tr className="cursor-pointer hover:bg-muted/60" onClick={() => toggle(s.id)}>
            <td className="max-w-[240px] px-3 py-2">
              <Tooltip>
                <TooltipTrigger className="flex max-w-full items-center gap-1.5 text-left">
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                      openId === s.id && "rotate-180",
                    )}
                  />
                  <span className="truncate">{s.fileName}</span>
                </TooltipTrigger>
                <TooltipContent>{s.fileName}</TooltipContent>
              </Tooltip>
            </td>
            <td className="px-3 py-2">{bankLabels[s.bank]}</td>
            <td className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
              {s.periodStart && s.periodEnd
                ? `${formatDate(s.periodStart)} – ${formatDate(s.periodEnd)}`
                : "—"}
            </td>
            <td className="px-3 py-2 text-right tabular-nums">
              {s.importedCount}
              {s.duplicateCount > 0 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  (+{s.duplicateCount} dup)
                </span>
              )}
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-abono">
              {formatMXN(s.totalAbonos)}
            </td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-cargo">
              {formatMXN(s.totalCargos)}
            </td>
            <td className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">
              {formatDate(s.createdAt)}
              {s.importedByName ? ` · ${s.importedByName}` : ""}
            </td>
          </tr>
          {openId === s.id && (
            <tr>
              <td colSpan={7} className="bg-muted/30 p-3">
                {pending && !rows ? (
                  <p className="p-2 text-sm text-muted-foreground">Cargando movimientos…</p>
                ) : (
                  <TransactionsTable rows={rows ?? []} categoryOrder={STATEMENT_CATEGORY_ORDER} />
                )}
              </td>
            </tr>
          )}
        </Fragment>
      ))}
    </>
  );
}
