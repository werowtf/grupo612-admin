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
  canAccessOficina: boolean;
  oficina: boolean;
  userName: string;
  roleLabel: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  venues,
  selectedVenueId,
  selectedVenueSlug,
  canAccessOficina,
  oficina,
  userName,
  roleLabel,
  children,
}: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  const logo = selectedVenueSlug ? VENUE_LOGOS[selectedVenueSlug] : null;

  return (
    <div className="flex min-h-screen">
      <AppSidebar
        role={role}
        venueSlug={selectedVenueSlug}
        oficina={oficina}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          role={role}
          venues={venues}
          selectedVenueId={selectedVenueId}
          canAccessOficina={canAccessOficina}
          oficina={oficina}
          userName={userName}
          roleLabel={roleLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">
          <div key={pathname} className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            {logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="mb-4 h-16 w-auto" />
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
