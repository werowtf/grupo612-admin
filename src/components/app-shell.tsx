"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import type { UserRole } from "@/generated/prisma/enums";

interface Props {
  role: UserRole;
  venues: { id: string; name: string }[];
  selectedVenueId: string | null;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({ role, venues, selectedVenueId, userName, roleLabel, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={role} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          role={role}
          venues={venues}
          selectedVenueId={selectedVenueId}
          userName={userName}
          roleLabel={roleLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
