"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Building2, ChevronDown, LogOut, Menu, Moon, ScrollText, Sun, Users } from "lucide-react";
import { logoutAction, selectVenueAction } from "@/app/(app)/actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
          className="-ml-1.5 rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden"
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
          <span className="text-sm text-muted-foreground">Sin negocios</span>
        )}
      </div>

      <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={mounted && resolvedTheme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {mounted && resolvedTheme === "dark" ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/50">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block font-medium leading-tight">{userName}</span>
            <span className="block text-[11px] leading-tight text-muted-foreground">
              {roleLabel}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
      </div>
    </header>
  );
}
