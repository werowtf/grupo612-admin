"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { VENUE_LOGOS } from "@/lib/venue-logos";
import type { UserRole } from "@/generated/prisma/enums";

interface Props {
  role: UserRole;
  venues: { id: string; name: string }[];
  selectedVenueId: string | null;
  selectedVenueSlug: string | null;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  venues,
  selectedVenueId,
  selectedVenueSlug,
  userName,
  roleLabel,
  children,
}: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const logo = selectedVenueSlug ? VENUE_LOGOS[selectedVenueSlug] : null;

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
            {logo && (
              <div className="mb-4 inline-flex rounded-xl bg-white p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" className="h-16 w-auto" />
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
