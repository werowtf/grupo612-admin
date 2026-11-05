"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MonthPicker } from "@/components/month-picker";
import { cn } from "@/lib/utils";

const arrow =
  "flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted";

/** Paginación de la lista de cortes por mes: anterior, selector de mes y siguiente. */
export function CortesMonthNav({
  value,
  prev,
  next,
}: {
  /** Mes mostrado, "yyyy-MM". */
  value: string;
  prev: string;
  /** null = ya es el último mes con sentido (no hay cortes futuros). */
  next: string | null;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <Link href={`/cortes?mes=${prev}`} aria-label="Mes anterior" className={arrow}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {/* key: al navegar con las flechas el selector se vuelve a montar con el mes nuevo */}
      <MonthPicker key={value} name="mes" defaultValue={value} onChange={(v) => router.push(`/cortes?mes=${v}`)} />
      {next ? (
        <Link href={`/cortes?mes=${next}`} aria-label="Mes siguiente" className={arrow}>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(arrow, "pointer-events-none opacity-40")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}
