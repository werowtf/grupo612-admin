"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Scale,
  ListOrdered,
  ScrollText,
  Users,
  Receipt,
  Wallet,
  FileText,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import type { UserRole } from "@/generated/prisma/enums";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[]; // si se define, sólo estos roles lo ven
  soon?: boolean; // módulo del roadmap, aún no disponible
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conciliacion", label: "Conciliación bancaria", icon: Scale },
  { href: "/movimientos", label: "Movimientos", icon: ListOrdered },
  { href: "/cortes", label: "Cortes de caja", icon: Receipt },
  { href: "/ingresos-egresos", label: "Ingresos y egresos", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/documentos", label: "Documentos", icon: FileText },
  { href: "/bitacora", label: "Bitácora", icon: ScrollText, roles: ["ADMIN"] },
  { href: "/usuarios", label: "Usuarios", icon: Users, roles: ["ADMIN"] },
];

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV.filter((i) => !i.roles || i.roles.includes(role));

  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex md:flex-col print:hidden">
      <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4">
        <Logo className="h-9 w-auto" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            !item.soon &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));
          const Icon = item.icon;

          if (item.soon) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400"
                title="Próximamente"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Pronto
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[var(--color-fg)]",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--color-border)] p-3 text-[11px] text-[var(--color-muted)]">
        Plataforma v0.1 — Conciliación
      </div>
    </aside>
  );
}
