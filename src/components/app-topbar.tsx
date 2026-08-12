"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, ChevronDown, LogOut, Menu, ScrollText, Users } from "lucide-react";
import { logoutAction, selectVenueAction } from "@/app/(app)/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { UserRole } from "@/generated/prisma/enums";

interface VenueOption {
  id: string;
  name: string;
}

interface Props {
  role: UserRole;
  venues: VenueOption[];
  selectedVenueId: string | null;
  userName: string;
  roleLabel: string;
  onOpenMobileNav?: () => void;
}

export function AppTopbar({ role, venues, selectedVenueId, userName, roleLabel, onOpenMobileNav }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onVenueChange(id: string) {
    startTransition(async () => {
      await selectVenueAction(id);
      router.refresh();
    });
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 print:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Abrir menú"
          className="-ml-1.5 rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-gray-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Building2 className="hidden h-4 w-4 text-brand-500 sm:block" />
        {venues.length > 0 ? (
          <Select value={selectedVenueId ?? undefined} onValueChange={onVenueChange} disabled={pending}>
            <SelectTrigger>
              <SelectValue>{venues.find((v) => v.id === selectedVenueId)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {venues.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-[var(--color-muted)]">Sin negocios</span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50">
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {role === "ADMIN" && (
            <>
              <DropdownMenuItem render={<Link href="/bitacora" />}>
                <ScrollText className="h-4 w-4" />
                Logs
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/usuarios" />}>
                <Users className="h-4 w-4" />
                Usuarios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem variant="destructive" render={<form action={logoutAction} />}>
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
