"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePedidosSaveBeforeNavigate } from "@/components/pedidos-save-context";
import { cn } from "@/lib/utils";

export interface PedidosTab {
  id: string;
  label: string;
  href: string;
  active: boolean;
}

export function PedidosTabs({ tabs }: { tabs: PedidosTab[] }) {
  const router = useRouter();
  const saveBeforeNavigate = usePedidosSaveBeforeNavigate();
  const [navigating, setNavigating] = useState<string | null>(null);

  async function go(tab: PedidosTab, e: React.MouseEvent) {
    e.preventDefault();
    if (tab.active) return;
    setNavigating(tab.id);
    await saveBeforeNavigate();
    router.push(tab.href);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tabs.map((tab) => (
        <a
          key={tab.id}
          href={tab.href}
          onClick={(e) => go(tab, e)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm",
            tab.active
              ? "bg-brand-600 font-medium text-white"
              : "border border-brand-600 text-brand-600 hover:bg-brand-50",
            navigating === tab.id && !tab.active && "opacity-60",
          )}
        >
          {tab.label}
        </a>
      ))}
    </div>
  );
}
