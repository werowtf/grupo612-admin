"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Check } from "lucide-react";
import { updatePropinaCorteAction } from "@/app/(app)/por-pagar/actions";
import { formatMXN, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface PropinaRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  amount: number;
  paid: boolean;
  folioCorteZ: string | null;
}

type Estado = "PENDIENTE" | "PAGADO";

export function PropinasPorCorteManager({ rows }: { rows: PropinaRow[] }) {
  const router = useRouter();
  const [estados, setEstados] = useState<Record<string, Estado>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.paid ? "PAGADO" : "PENDIENTE"])),
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onChange(corteId: string, estado: Estado) {
    setEstados((e) => ({ ...e, [corteId]: estado }));
    setSavingId(corteId);
    setError(null);
    const res = await updatePropinaCorteAction(corteId, estado === "PAGADO");
    setSavingId(null);
    if (res.error) setError(res.error);
    else router.refresh();
  }

  const total = rows.reduce((sum, r) => sum + (estados[r.id] === "PENDIENTE" ? r.amount : 0), 0);

  if (rows.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-muted-foreground">
        No hay propinas capturadas en cortes de caja todavía.
      </div>
    );
  }

  return (
    <div className="card min-w-0 space-y-3 p-5">
      <h2 className="text-base font-semibold">Propinas</h2>

      {error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
              <th className="px-3 py-2 font-semibold">Fecha</th>
              <th className="hidden px-3 py-2 font-semibold sm:table-cell">Concepto</th>
              <th className="px-3 py-2 text-right font-semibold">Monto</th>
              <th className="px-3 py-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-muted/60">
                <td className="whitespace-nowrap px-3 py-2 font-semibold">{formatDate(r.date)}</td>
                <td className="hidden px-3 py-2 sm:table-cell">
                  <Link href={`/cortes/${r.id}`} className="text-brand-600 hover:underline">
                    Propina corte{r.folioCorteZ ? ` #${r.folioCorteZ}` : ""}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-cargo">{formatMXN(r.amount)}</td>
                <td className="px-3 py-2">
                  {estados[r.id] === "PAGADO" ? (
                    <div className="flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-abono">
                        <Check className="h-3.5 w-3.5" />
                        Pagada
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={savingId === r.id}
                        onClick={() => onChange(r.id, "PENDIENTE")}
                      >
                        Deshacer
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingId === r.id}
                        onClick={() => onChange(r.id, "PAGADO")}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Pagado
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-table-header/60 font-semibold">
              <td className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground sm:hidden">
                Total pendiente
              </td>
              <td colSpan={2} className="hidden px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground sm:table-cell">
                Total pendiente
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-cargo">{formatMXN(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
