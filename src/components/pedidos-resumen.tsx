"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { saveFoliosAction, type PedidosActionState } from "@/app/(app)/pedidos/actions";
import { usePedidosSaveRegistration } from "@/components/pedidos-save-context";
import { formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ProductoResumen } from "@/lib/pedidos/queries";

const init: PedidosActionState = {};

export function PedidosResumen({
  venueId,
  year,
  month,
  days,
  productos,
  quantities,
  dailyTotals, // índice 0 = día 1 del mes completo (incluye domingos, aunque no se muestren)
  subtotal,
  totalConIva,
  ivaRate,
  initialFolios, // día (1-31) -> folio
}: {
  venueId: string;
  year: number;
  month: number;
  days: number[];
  productos: ProductoResumen[];
  quantities: Record<string, number>;
  dailyTotals: number[];
  subtotal: number;
  totalConIva: number;
  ivaRate: number;
  initialFolios: Record<number, string>;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState(saveFoliosAction, init);
  const [folios, setFolios] = useState<Record<number, string>>(initialFolios);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const dirty = JSON.stringify(folios) !== JSON.stringify(initialFolios);
  const doAutoSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("venueId", venueId);
    fd.set("year", String(year));
    fd.set("month", String(month));
    for (const [day, folio] of Object.entries(folios)) fd.set(`folio_${day}`, folio);
    await saveFoliosAction(init, fd);
  }, [venueId, year, month, folios]);
  // Guarda automáticamente los folios al cambiar de café o sección.
  usePedidosSaveRegistration(dirty ? doAutoSave : null);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Vista de solo lectura: suma los pedidos de los 3 cafés por producto. Para editar cantidades o
        facturar por café, selecciona un café específico. Aquí sólo se captura el folio de la factura
        diaria (una factura al día cubre los 3 cafés juntos).
      </p>

      {state.error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                  <th className="sticky left-0 z-10 bg-table-header px-3 py-2 font-semibold">Producto</th>
                  <th className="px-2 py-2 text-right font-semibold">Precio</th>
                  {days.map((d) => (
                    <th key={d} className="px-px py-2 text-center font-semibold">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productos.map((p) => (
                  <tr key={p.name} className="hover:bg-muted/40">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 font-medium">{p.name}</td>
                    <td className="px-2 py-1.5 text-right font-semibold tabular-nums text-cargo">{formatMXN(p.price)}</td>
                    {days.map((day) => {
                      const qty = quantities[`${p.name}_${day}`] ?? 0;
                      return (
                        <td key={day} className="px-px py-1.5 text-center tabular-nums text-[11px]">
                          {qty > 0 ? qty : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-table-header/40">
                  <td className="sticky left-0 z-10 bg-table-header/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    # Factura
                  </td>
                  <td></td>
                  {days.map((day) => (
                    <td key={day} className="px-px py-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        name={`folio_${day}`}
                        value={folios[day] ?? ""}
                        placeholder="—"
                        onChange={(e) => setFolios((f) => ({ ...f, [day]: e.target.value.slice(0, 6) }))}
                        className="w-9 rounded border border-border bg-transparent px-0.5 py-1 text-center text-[11px] tabular-nums outline-none placeholder:text-muted-foreground/40 focus:border-brand-600"
                      />
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border bg-table-header/60 font-semibold">
                  <td className="sticky left-0 z-10 bg-table-header/60 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Total del día
                  </td>
                  <td></td>
                  {days.map((day) => {
                    const t = dailyTotals[day - 1] ?? 0;
                    return (
                      <td key={day} className="px-px py-2 text-center text-[9px] tabular-nums">
                        {t > 0 ? formatMXN(t).replace("$", "").split(".")[0] : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="text-sm">
            <p>Subtotal: <span className="font-semibold tabular-nums">{formatMXN(subtotal)}</span></p>
            <p>
              Total con IVA ({Math.round(ivaRate * 100)}%):{" "}
              <span className="font-semibold tabular-nums">{formatMXN(totalConIva)}</span>
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar folios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
