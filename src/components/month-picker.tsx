"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function parseValue(value: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function toValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

interface Props {
  name: string;
  defaultValue: string;
}

export function MonthPicker({ name, defaultValue }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const { year: selectedYear, month: selectedMonth } = parseValue(value);
  const [viewYear, setViewYear] = useState(selectedYear);

  const label = `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setViewYear(selectedYear); }}>
      <input type="hidden" name={name} value={value} />
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none focus:border-brand-500"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="rounded p-1 hover:bg-muted"
            aria-label="Año anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            className="rounded p-1 hover:bg-muted"
            aria-label="Año siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {MONTHS.map((m, i) => {
            const monthNum = i + 1;
            const active = viewYear === selectedYear && monthNum === selectedMonth;
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setValue(toValue(viewYear, monthNum));
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm",
                  active
                    ? "bg-brand-500 font-medium text-white"
                    : "text-foreground hover:bg-brand-50",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
