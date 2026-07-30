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
    return <p className="text-sm text-[var(--color-muted)]">Sin datos en el periodo.</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((i, idx) => (
        <li key={i.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="truncate pr-2">{i.label}</span>
            <span className="shrink-0 tabular-nums text-[var(--color-muted)]">{format(i.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
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

/** Dona (SVG) con leyenda para mostrar una distribución. */
export function Donut({ items, size = 160 }: { items: ChartItem[]; size?: number }) {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((s, i) => s + i.value, 0);
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total <= 0) {
    return <p className="text-sm text-[var(--color-muted)]">Sin datos en el periodo.</p>;
  }

  let offset = 0;
  const segments = data.map((i, idx) => {
    const frac = i.value / total;
    const len = frac * circumference;
    const seg = {
      color: i.color ?? CHART_COLORS[idx % CHART_COLORS.length],
      dash: `${len} ${circumference - len}`,
      offset: -offset,
      label: i.label,
      value: i.value,
      pct: Math.round(frac * 100),
    };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <g transform={`rotate(-90 ${cx} ${cx})`}>
          <circle cx={cx} cy={cx} r={radius} fill="none" stroke="#f1f2f4" strokeWidth={stroke} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={cx}
              cy={cx}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dash}
              strokeDashoffset={s.offset}
            />
          ))}
        </g>
        <text x={cx} y={cx - 4} textAnchor="middle" className="fill-[var(--color-fg)] text-sm font-semibold">
          {formatMXN(total)}
        </text>
        <text x={cx} y={cx + 14} textAnchor="middle" className="fill-[var(--color-muted)] text-[10px]">
          total
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="tabular-nums text-[var(--color-muted)]">
              {formatMXN(s.value)} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
