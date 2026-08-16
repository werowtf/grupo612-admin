import { Info } from "lucide-react";
import { formatMXN } from "@/lib/utils";

/** Paleta de categorías (consistente en toda la app). */
export const CHART_COLORS = [
  "#059669", // brand
  "#2563eb",
  "#d97706",
  "#7c3aed",
  "#dc2626",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#9ca3af",
];

export interface ChartItem {
  label: string;
  value: number;
  color?: string;
}

/** Barras horizontales con etiqueta y monto. */
export function BarList({
  items,
  format = formatMXN,
}: {
  items: ChartItem[];
  format?: (n: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Sin datos en el periodo.</span>
      </div>
    );
  }
  return (
    <ul className="space-y-2.5">
      {items.map((i, idx) => (
        <li key={i.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate pr-2">{i.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{format(i.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(i.value / max) * 100}%`,
                backgroundColor: i.color ?? CHART_COLORS[idx % CHART_COLORS.length],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
