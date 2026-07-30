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
  PENDIENTE: "bg-gray-100 text-gray-600",
  CONCILIADO: "bg-brand-50 text-brand-700",
  IGNORADO: "bg-gray-100 text-gray-400 line-through",
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
