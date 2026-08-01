"use client";

import { useState } from "react";
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

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={role} mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          venues={venues}
          selectedVenueId={selectedVenueId}
          userName={userName}
          roleLabel={roleLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
