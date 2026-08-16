import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "pending";
  valueClassName?: string;
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-abono",
  negative: "text-cargo",
  pending: "text-pending",
};

export function StatCard({ label, value, hint, icon, tone = "default", valueClassName }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        {icon && <span className={valueClassName ?? toneClass[tone]}>{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", valueClassName ?? toneClass[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
