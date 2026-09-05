"use client";

import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// A diferencia de formatDate() (que asume medianoche UTC, la convención para
// fechas ya guardadas), este Date viene de fromDateStr() en hora LOCAL — hay
// que formatearlo también en hora local o el día se corre en husos delante
// de UTC.
const displayFmt = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" });

/** "YYYY-MM-DD" -> Date en hora local (medianoche), igual que <input type="date">. */
function fromDateStr(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date (hora local) -> "YYYY-MM-DD", igual que el value nativo de <input type="date">. */
function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface Props {
  id?: string;
  name?: string;
  value: string; // "YYYY-MM-DD" o ""
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}

/**
 * Reemplaza <input type="date">: mismo contrato de valor ("YYYY-MM-DD") para
 * no tocar el resto del formulario, pero con un calendario propio en vez del
 * selector nativo del sistema operativo/navegador.
 */
export function DatePicker({ id, name, value, onChange, required, readOnly, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = fromDateStr(value);

  return (
    <Popover open={open} onOpenChange={(o) => !readOnly && setOpen(o)}>
      {name && <input type="hidden" name={name} value={value} required={required} />}
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={readOnly}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg border border-transparent bg-field-bg px-2.5 text-sm outline-none hover:bg-muted/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected ? displayFmt.format(selected) : "Selecciona una fecha"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(toDateStr(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
