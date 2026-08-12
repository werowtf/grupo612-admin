"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  ListOrdered,
  ScrollText,
  Users,
  Receipt,
  Wallet,
  FileText,
  BarChart3,
  ShieldUser,
  ChevronDown,
  X,
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

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV: NavEntry[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/conciliacion", label: "Estados de cuenta", icon: Landmark },
  { href: "/movimientos", label: "Movimientos", icon: ListOrdered },
  { href: "/cortes", label: "Cortes de caja", icon: Receipt },
  { href: "/ingresos-egresos", label: "Ingresos y egresos", icon: Wallet },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/documentos", label: "Documentos", icon: FileText },
  {
    label: "Administrador",
    icon: ShieldUser,
    roles: ["ADMIN"],
    children: [
      { href: "/bitacora", label: "Logs", icon: ScrollText },
      { href: "/usuarios", label: "Usuarios", icon: Users },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({ role, onNavigate }: { role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Cajero sólo interactúa con Cortes de caja (ver también proxy.ts, que
  // confina su navegación al mismo alcance a nivel de ruta).
  const entries = NAV.filter((e) => !e.roles || e.roles.includes(role)).filter(
    (e) => role !== "CAJERO" || (!isGroup(e) && e.href === "/cortes"),
  );

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {entries.map((entry) => {
        if (isGroup(entry)) {
          return (
            <NavGroupItem
              key={entry.label}
              group={entry}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          );
        }

        const item = entry;
        const active = !item.soon && isActive(pathname, item.href);
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
            onClick={onNavigate}
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
  );
}

function NavGroupItem({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = group.children.some((c) => isActive(pathname, c.href));
  const [open, setOpen] = useState(groupActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          groupActive
            ? "text-brand-700"
            : "text-gray-600 hover:bg-gray-50 hover:text-[var(--color-fg)]",
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-4 mt-1 space-y-1 border-l border-[var(--color-border)] pl-3">
          {group.children.map((item) => {
            const active = isActive(pathname, item.href);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-[var(--color-fg)]",
                )}
              >
                <ItemIcon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Props {
  role: UserRole;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AppSidebar({ role, mobileOpen = false, onCloseMobile }: Props) {
  return (
    <>
      {/* Escritorio: fija en el layout */}
      <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex md:flex-col print:hidden">
        <div className="flex h-14 items-center justify-center border-b border-[var(--color-border)] px-4">
          <Logo className="h-9 w-auto" />
        </div>
        <NavLinks role={role} />
        <div className="border-t border-[var(--color-border)] p-3 text-[11px] text-[var(--color-muted)]">
          Grupo612 Admin v0.1
        </div>
      </aside>

      {/* Mobile: menú hamburguesa (overlay + panel deslizable) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[var(--color-surface)] shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
              <Logo className="h-9 w-auto" />
              <button
                type="button"
                onClick={onCloseMobile}
                aria-label="Cerrar menú"
                className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks role={role} onNavigate={onCloseMobile} />
            <div className="border-t border-[var(--color-border)] p-3 text-[11px] text-[var(--color-muted)]">
              Grupo612 Admin v0.1
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
