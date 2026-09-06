"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Info } from "lucide-react";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMXN } from "@/lib/utils";
import type { DailySalesDailyTotal } from "@/lib/daily-sales/queries";
import { RANGES, type RangeKey } from "@/lib/dashboard/ranges";

const chartConfig = {
  comida: { label: "Comida", color: "var(--color-abono)" },
  bebida: { label: "Bebida", color: "var(--color-cargo)" },
} satisfies ChartConfig;

function formatDayMonth(isoDate: string): string {
  const [, m, d] = isoDate.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}

export function AreaChartInteractive({ data, range }: { data: DailySalesDailyTotal[]; range: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtered = data;

  function setRange(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("rango", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Venta diaria</h2>
          <p className="text-sm text-muted-foreground">{RANGES[range].label}</p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="h-8 w-[160px] border-transparent bg-field-bg font-normal text-foreground hover:bg-muted/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(RANGES).map(([key, r]) => (
              <SelectItem key={key} value={key}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex items-start gap-2 rounded-lg bg-success-bg px-3 py-2 text-sm text-success">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Sin datos en el periodo.</span>
        </div>
      ) : (
        <ChartContainer config={chartConfig} className="aspect-auto h-[260px] w-full">
          <AreaChart data={filtered}>
            <defs>
              <linearGradient id="fillComida" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-comida)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-comida)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="fillBebida" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-bebida)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-bebida)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDayMonth}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDayMonth(String(value))}
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center justify-between gap-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.color }}
                        />
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                      </span>
                      <span className="font-sans font-medium tabular-nums text-foreground">
                        {formatMXN(Number(value))}
                      </span>
                    </div>
                  )}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="comida"
              type="monotone"
              fill="url(#fillComida)"
              stroke="var(--color-comida)"
              stackId="a"
            />
            <Area
              dataKey="bebida"
              type="monotone"
              fill="url(#fillBebida)"
              stroke="var(--color-bebida)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      )}
    </div>
  );
}
