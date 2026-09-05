import { formatMXN } from "@/lib/utils";
import type { ProductoResumen } from "@/lib/pedidos/queries";

export function PedidosResumen({
  daysInMonth,
  productos,
  quantities,
  dailyTotals,
  subtotal,
  totalConIva,
  ivaRate,
}: {
  daysInMonth: number;
  productos: ProductoResumen[];
  quantities: Record<string, number>;
  dailyTotals: number[];
  subtotal: number;
  totalConIva: number;
  ivaRate: number;
}) {
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Vista de solo lectura: suma los pedidos de los 3 cafés por producto. Para editar o facturar,
        selecciona un café específico.
      </p>

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
              {productos.map((p) => (
                <tr key={p.name} className="hover:bg-muted/40">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-3 py-1.5 font-medium">{p.name}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-cargo">{formatMXN(p.price)}</td>
                  {days.map((day) => {
                    const qty = quantities[`${p.name}_${day}`] ?? 0;
                    return (
                      <td key={day} className="px-1 py-1.5 text-center tabular-nums text-xs">
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
                {dailyTotals.map((t, i) => (
                  <td key={i} className="px-1 py-2 text-center text-[10px] tabular-nums">
                    {t > 0 ? formatMXN(t).replace("$", "").split(".")[0] : <span className="text-muted-foreground/40">—</span>}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3 text-sm">
        <p>Subtotal: <span className="font-semibold tabular-nums">{formatMXN(subtotal)}</span></p>
        <p>
          Total con IVA ({Math.round(ivaRate * 100)}%):{" "}
          <span className="font-semibold tabular-nums">{formatMXN(totalConIva)}</span>
        </p>
      </div>
    </div>
  );
}
