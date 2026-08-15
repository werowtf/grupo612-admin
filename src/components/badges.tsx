import { cn } from "@/lib/utils";
import { categoryBadge, categoryLabels, statusLabels } from "@/lib/labels";
import type { TxCategory, TxStatus } from "@/generated/prisma/enums";

export function CategoryBadge({ category }: { category: TxCategory }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        categoryBadge[category],
      )}
    >
      {categoryLabels[category]}
    </span>
  );
}

const statusStyle: Record<TxStatus, string> = {
  PENDIENTE: "bg-muted text-muted-foreground",
  CONCILIADO: "bg-brand-50 text-brand-600",
  IGNORADO: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: TxStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        statusStyle[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
