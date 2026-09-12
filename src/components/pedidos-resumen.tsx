"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { useActionState } from "react";
import {
  saveFoliosAction,
  updateFacturaEstadoAction,
  type PedidosActionState,
} from "@/app/(app)/pedidos/actions";
import { usePedidosSaveRegistration } from "@/components/pedidos-save-context";
import { formatMXN, formatDate } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ProductoResumen, FacturacionDia } from "@/lib/pedidos/queries";
import type { FacturaEstado } from "@/generated/prisma/enums";

const init: PedidosActionState = {};

const ESTADO_LABELS: Record<FacturaEstado, string> = {
  PENDIENTE: "Pendiente",
  FACTURADO: "Facturado",
  PAGADO: "Pagado",
};
const ESTADOS: FacturaEstado[] = ["PENDIENTE", "FACTURADO", "PAGADO"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

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
  initialFacturacion, // día (1-31) -> {folio, status}
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
  initialFacturacion: Record<number, FacturacionDia>;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState(saveFoliosAction, init);
  const [folios, setFolios] = useState<Record<number, string>>(() =>
    Object.fromEntries(days.map((d) => [d, initialFacturacion[d]?.folio ?? ""])),
  );
  const initialFolios = Object.fromEntries(days.map((d) => [d, initialFacturacion[d]?.folio ?? ""]));
  const [estados, setEstados] = useState<Record<number, FacturaEstado>>(() =>
    Object.fromEntries(days.map((d) => [d, initialFacturacion[d]?.status ?? "PENDIENTE"])),
  );
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [estadoError, setEstadoError] = useState<string | null>(null);
  const [focusedDay, setFocusedDay] = useState<number | null>(null);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  // El recuadro principal muestra el corte del día de hoy (suma de los 3
  // cafés), no el acumulado del mes — sólo tiene sentido cuando el mes que
  // se está viendo es el mes actual. El total del mes se conserva abajo.
  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;
  const subtotalDia = isCurrentMonth ? (dailyTotals[today.getDate() - 1] ?? 0) : 0;
  const totalConIvaDia = subtotalDia * (1 + ivaRate);

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

  async function onEstadoChange(day: number, status: FacturaEstado) {
    setEstados((e) => ({ ...e, [day]: status }));
    setSavingDay(day);
    setEstadoError(null);
    const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
    const res = await updateFacturaEstadoAction(venueId, dateStr, status);
    setSavingDay(null);
    if (res.error) setEstadoError(res.error);
    else router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Vista de solo lectura: suma los pedidos de los 3 cafés por producto. Para editar cantidades o
        facturar por café, selecciona un café específico.
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
                <tr className="border-t border-border bg-table-header/60 font-semibold">
                  <td className="sticky left-0 z-10 bg-table-header/60 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Total del día
                  </td>
                  <td></td>
                  {days.map((day) => {
                    const t = (dailyTotals[day - 1] ?? 0) * (1 + ivaRate);
                    return (
                      <td key={day} className="px-px py-2 text-center text-xs font-semibold tabular-nums text-abono">
                        {t > 0 ? formatMXN(t).replace("$", "").split(".")[0] : null}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 text-sm">
          <div>
            <p>Subtotal del día: <span className="font-semibold tabular-nums">{formatMXN(subtotalDia)}</span></p>
            <p>
              Total con IVA del día ({Math.round(ivaRate * 100)}%):{" "}
              <span className="font-semibold tabular-nums">{formatMXN(totalConIvaDia)}</span>
            </p>
          </div>
          {saving && <p className="text-xs text-muted-foreground">Guardando folios…</p>}
        </div>

        <div className="mt-3 rounded-lg border border-border bg-card p-3 text-sm">
          <p>Subtotal del mes: <span className="font-semibold tabular-nums">{formatMXN(subtotal)}</span></p>
          <p>
            Total con IVA del mes ({Math.round(ivaRate * 100)}%):{" "}
            <span className="font-semibold tabular-nums">{formatMXN(totalConIva)}</span>
          </p>
        </div>
      </form>

      {/* Facturación diaria: Comisariato factura todos los días menos domingo
          (por eso "days" ya los excluye). El estado por default es Pendiente
          hasta que alguien lo actualice a mano; al pasar a Pagado se crea el
          ingreso correspondiente en Ingresos y egresos. */}
      <div className="card overflow-hidden">
        <div className="border-b border-border p-3">
          <h2 className="text-sm font-semibold">Facturación diaria</h2>
        </div>
        {estadoError && (
          <p className="flex items-start gap-2 bg-danger-bg px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {estadoError}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Número</th>
                <th className="px-3 py-2 text-right font-semibold">Monto</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {days.map((day) => {
                const dateStr = `${year}-${pad2(month)}-${pad2(day)}`;
                const monto = (dailyTotals[day - 1] ?? 0) * (1 + ivaRate);
                return (
                  <tr key={day} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-1.5 font-medium">{formatDate(dateStr)}</td>
                    <td className="px-3 py-1.5">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={folios[day] ?? ""}
                        placeholder={focusedDay === day ? "" : "—"}
                        onFocus={() => setFocusedDay(day)}
                        onBlur={() => setFocusedDay((d) => (d === day ? null : d))}
                        onChange={(e) => setFolios((f) => ({ ...f, [day]: e.target.value.slice(0, 6) }))}
                        className="w-24 rounded bg-field-bg px-2 py-1 text-sm font-medium tabular-nums outline-none placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-brand-600"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-abono">
                      {monto > 0 ? formatMXN(monto) : "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <Select
                        value={estados[day] ?? "PENDIENTE"}
                        onValueChange={(v) => onEstadoChange(day, v as FacturaEstado)}
                      >
                        <SelectTrigger
                          className="h-8 w-36 border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50"
                          disabled={savingDay === day}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ESTADOS.map((s) => (
                            <SelectItem key={s} value={s}>
                              {ESTADO_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
