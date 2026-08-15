import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "positive" | "negative" | "warning" | "pending";
}

const toneClass: Record<NonNullable<Props["tone"]>, string> = {
  default: "text-foreground",
  positive: "text-abono",
  negative: "text-cargo",
  warning: "text-orange-500",
  pending: "text-pending",
};

export function StatCard({ label, value, hint, icon, tone = "default" }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-2xl font-semibold tabular-nums", toneClass[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
