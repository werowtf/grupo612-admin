"use client";

import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatMXN } from "@/lib/utils";

export interface RadialChartItem {
  label: string;
  value: number;
}

/** Misma paleta muted usada en "Por categoría" del Dashboard. */
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function RadialChartCard({ items }: { items: RadialChartItem[] }) {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((s, i) => s + i.value, 0);

  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en el periodo.</p>;
  }

  const max = Math.max(...data.map((i) => i.value));
  const chartData = data.map((i, idx) => ({
    label: i.label,
    value: i.value,
    fill: COLORS[idx % COLORS.length],
  }));

  const chartConfig = Object.fromEntries(
    data.map((i, idx) => [i.label, { label: i.label, color: COLORS[idx % COLORS.length] }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square w-[160px]">
        <RadialBarChart data={chartData} innerRadius="18%" outerRadius="85%" barSize={12}>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                hideLabel
                nameKey="label"
                formatter={(value, _name, _item, _index, payload) => {
                  const row = payload as unknown as { label?: string; fill?: string };
                  return (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: row.fill }}
                        />
                        {row.label}
                      </span>
                      <span className="font-sans font-medium tabular-nums text-foreground">
                        {formatMXN(Number(value))}
                      </span>
                    </div>
                  );
                }}
              />
            }
          />
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} axisLine={false} />
          <RadialBar dataKey="value" background cornerRadius={6} />
        </RadialBarChart>
      </ChartContainer>
      <ul className="space-y-1.5 text-sm">
        {chartData.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: d.fill }} />
            <span className="flex-1">{d.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {formatMXN(d.value)} · {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
