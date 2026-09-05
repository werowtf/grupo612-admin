"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { savePedidosAction, marcarFacturadoAction, type PedidosActionState } from "@/app/(app)/pedidos/actions";
import { formatMXN } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ProductoRow {
  id: string;
  name: string;
  price: number;
}

const init: PedidosActionState = {};

export function PedidosGrid({
  cafeteriaId,
  cafeteriaName,
  year,
  month,
  daysInMonth,
  productos,
  initialQuantities, // key `${productoId}_${day}` -> quantity
  ivaRate,
  facturado,
}: {
  cafeteriaId: string;
  cafeteriaName: string;
  year: number;
  month: number;
  daysInMonth: number;
  productos: ProductoRow[];
  initialQuantities: Record<string, number>;
  ivaRate: number;
  facturado: { amount: number; createdAt: string } | null;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState(savePedidosAction, init);
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities);
  const [facturando, setFacturando] = useState(false);
  const [facturarError, setFacturarError] = useState<string | null>(null);
  const [clearedKeys, setClearedKeys] = useState<Set<string>>(new Set());
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const readOnly = !!facturado;

  const dailyTotals = days.map((day) =>
    productos.reduce((sum, p) => sum + (quantities[`${p.id}_${day}`] ?? 0) * p.price, 0),
  );
  const subtotal = dailyTotals.reduce((a, b) => a + b, 0);
  const totalConIva = subtotal * (1 + ivaRate);

  async function onFacturar() {
    setFacturando(true);
    setFacturarError(null);
    const res = await marcarFacturadoAction(cafeteriaId, year, month);
    if (res.error) setFacturarError(res.error);
    setFacturando(false);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {facturado ? (
        <p className="flex items-start gap-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Mes facturado por {formatMXN(facturado.amount)} el{" "}
          {new Date(facturado.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}.
          Se generó el ingreso correspondiente en Ingresos y egresos.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Captura la cantidad de cada producto por día. Se guarda todo el mes de un jalón; cuando el mes
          esté completo, márcalo como facturado.
        </p>
      )}

      {facturarError && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {facturarError}
        </p>
      )}
      {state.error && (
        <p className="flex items-start gap-2 rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="cafeteriaId" value={cafeteriaId} />
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
                    <th key={d} className="px-1 py-2 text-center font-semibold">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {productos.map((p, rowIndex) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 font-medium">{p.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">{formatMXN(p.price)}</td>
                    {days.map((day) => {
                      const key = `${p.id}_${day}`;
                      const value = quantities[key] ?? 0;
                      const showEmpty = clearedKeys.has(key) && value === 0;
                      return (
                        <td key={day} className="px-0.5 py-1">
                          <input
                            ref={(el) => {
                              inputRefs.current[key] = el;
                            }}
                            type="number"
                            min={0}
                            step={1}
                            name={`qty_${key}`}
                            disabled={readOnly}
                            value={showEmpty ? "" : value}
                            onFocus={() => {
                              if (value === 0) setClearedKeys((s) => new Set(s).add(key));
                            }}
                            onBlur={() =>
                              setClearedKeys((s) => {
                                if (!s.has(key)) return s;
                                const next = new Set(s);
                                next.delete(key);
                                return next;
                              })
                            }
                            onChange={(e) =>
                              setQuantities((q) => ({ ...q, [key]: Math.max(0, Math.trunc(Number(e.target.value) || 0)) }))
                            }
                            onKeyDown={(e) => {
                              if (e.key !== "Tab") return;
                              const nextRow = e.shiftKey ? rowIndex - 1 : rowIndex + 1;
                              if (nextRow < 0 || nextRow >= productos.length) return; // deja el Tab por defecto en el borde
                              e.preventDefault();
                              inputRefs.current[`${productos[nextRow].id}_${day}`]?.focus();
                            }}
                            className="w-12 rounded border border-border bg-transparent px-1 py-1 text-center text-xs tabular-nums outline-none focus:border-brand-600 disabled:opacity-60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-table-header/60 font-semibold">
                  <td className="sticky left-0 z-10 bg-table-header/60 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Total del día
                  </td>
                  <td></td>
                  {dailyTotals.map((t, i) => (
                    <td key={i} className="px-1 py-2 text-center text-[10px] tabular-nums">
                      {t > 0 ? formatMXN(t).replace("$", "").split(".")[0] : "—"}
                    </td>
                  ))}
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
          <div className="flex items-center gap-2">
            {!readOnly && (
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : "Guardar pedidos"}
              </Button>
            )}
            {!readOnly && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button type="button" variant="outline" disabled={facturando || subtotal === 0} />}>
                  {facturando ? "Facturando…" : "Marcar facturado"}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Facturar {cafeteriaName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Se creará un ingreso de {formatMXN(totalConIva)} en Ingresos y egresos de Comisariato y
                      ya no se podrán editar los pedidos de este mes. Guarda los pedidos antes de continuar si
                      hiciste cambios sin guardar.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
                    <AlertDialogAction type="button" onClick={onFacturar}>
                      Facturar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
