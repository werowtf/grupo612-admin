"use client";

import { Info } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatMXN } from "@/lib/utils";

export interface PieChartItem {
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

export function PieChartCard({ items, colors = COLORS }: { items: PieChartItem[]; colors?: string[] }) {
  const data = items.filter((i) => i.value > 0);
  const total = data.reduce((s, i) => s + i.value, 0);

  if (total <= 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Sin datos en el periodo.</span>
      </div>
    );
  }

  const chartData = data.map((i, idx) => ({
    label: i.label,
    value: i.value,
    fill: colors[idx % colors.length],
  }));

  const chartConfig = Object.fromEntries(
    data.map((i, idx) => [i.label, { label: i.label, color: colors[idx % colors.length] }]),
  ) satisfies ChartConfig;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <ChartContainer config={chartConfig} className="mx-auto aspect-square w-[160px]">
        <PieChart>
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
          <Pie data={chartData} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="90%" strokeWidth={4}>
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-sm font-semibold">
                      {formatMXN(total)}
                    </tspan>
                    <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 16} className="fill-muted-foreground text-[10px]">
                      total
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="space-y-1.5 text-sm">
        {chartData.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: d.fill }} />
            <span className="flex-1">{d.label}</span>
            <span className="tabular-nums text-muted-foreground">
              <span className="font-semibold">{formatMXN(d.value)}</span> · {Math.round((d.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
