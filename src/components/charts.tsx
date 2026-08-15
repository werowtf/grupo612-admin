import { formatMXN } from "@/lib/utils";

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Formatea una fecha YYYY-MM-DD como "29 jun" sin pasar por Date (evita saltos de zona horaria). */
function formatDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  return `${Number(d)} ${MONTHS_ES[Number(m) - 1]}`;
}

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
    return <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>;
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

/** Dona (SVG) con leyenda para mostrar una distribución. */
export function Donut({ items, size = 160 }: { items: ChartItem[]; size?: number }) {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((s, i) => s + i.value, 0);
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>;
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
          <circle cx={cx} cy={cx} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
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
        <text x={cx} y={cx - 4} textAnchor="middle" className="fill-foreground text-sm font-semibold">
          {formatMXN(total)}
        </text>
        <text x={cx} y={cx + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">
          total
        </text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="flex-1">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatMXN(s.value)} · {s.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface AreaSeriesPoint {
  date: string; // YYYY-MM-DD
  abonos: number;
  cargos: number;
}

/** Área apilada (SVG) comparando dos series (p.ej. abonos vs. cargos) en el tiempo. */
export function AreaChart({
  data,
  width = 640,
  height = 220,
}: {
  data: AreaSeriesPoint[];
  width?: number;
  height?: number;
}) {
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>;
  }

  const max = Math.max(...data.map((d) => Math.max(d.abonos, d.cargos)), 1);
  const x = (i: number) => padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - (v / max) * innerH;

  const linePath = (key: "abonos" | "cargos") =>
    data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d[key])}`).join(" ");

  const areaPath = (key: "abonos" | "cargos") =>
    `${linePath(key)} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;

  const abonosColor = "var(--color-abono)";
  const cargosColor = "var(--color-cargo)";

  // Hasta 5 etiquetas de fecha distribuidas en el eje X.
  const tickCount = Math.min(5, data.length);
  const tickIdx = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i / Math.max(tickCount - 1, 1)) * (data.length - 1)),
  );

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + innerH * f}
            y2={padding.top + innerH * f}
            stroke="var(--color-border)"
            strokeWidth={1}
          />
        ))}
        <path d={areaPath("abonos")} fill={abonosColor} fillOpacity={0.15} stroke="none" />
        <path d={linePath("abonos")} fill="none" stroke={abonosColor} strokeWidth={2} />
        <path d={areaPath("cargos")} fill={cargosColor} fillOpacity={0.15} stroke="none" />
        <path d={linePath("cargos")} fill="none" stroke={cargosColor} strokeWidth={2} />
        {tickIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[10px]"
          >
            {formatDayMonth(data[i].date)}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: abonosColor }} />
          Abonos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cargosColor }} />
          Cargos
        </span>
      </div>
    </div>
  );
}
