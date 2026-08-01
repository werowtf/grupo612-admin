"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, LogOut } from "lucide-react";
import { logoutAction, selectVenueAction } from "@/app/(app)/actions";

interface VenueOption {
  id: string;
  name: string;
}

interface Props {
  venues: VenueOption[];
  selectedVenueId: string | null;
  userName: string;
  roleLabel: string;
}

export function AppTopbar({ venues, selectedVenueId, userName, roleLabel }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  function onVenueChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    startTransition(async () => {
      await selectVenueAction(id);
      router.refresh();
    });
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 print:hidden">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-brand-500" />
        {venues.length > 0 ? (
          <select
            value={selectedVenueId ?? ""}
            onChange={onVenueChange}
            disabled={pending || venues.length === 0}
            className="rounded-lg border border-brand-500 bg-brand-500 px-2 py-1.5 text-sm font-medium text-white outline-none focus:border-brand-700"
          >
            {venues.map((v) => (
              <option key={v.id} value={v.id} className="bg-white text-[var(--color-fg)]">
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-[var(--color-muted)]">Sin negocios</span>
        )}
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block font-medium leading-tight">{userName}</span>
            <span className="block text-[11px] leading-tight text-[var(--color-muted)]">
              {roleLabel}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-[var(--color-muted)]" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
