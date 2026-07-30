import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "warning";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-[var(--color-fg)]",
  positive: "text-brand-600",
  negative: "text-[var(--color-danger)]",
  warning: "text-[var(--color-warning)]",
};

export function StatCard({ label, value, hint, icon, tone = "default" }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-muted)]">{label}</span>
        {icon && <span className="text-[var(--color-muted)]">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
}
