import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { getSelectedVenue } from "@/lib/venue";
import { roleLabels } from "@/lib/labels";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "CONTADOR_EXTERNO") redirect("/portal");
  if (user.role === "COMPRAS") redirect("/compras");

  const venues = await getAccessibleVenues(user);
  const selected = await getSelectedVenue(venues);

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          venues={venues.map((v) => ({ id: v.id, name: v.name }))}
          selectedVenueId={selected?.id ?? null}
          userName={user.name}
          roleLabel={roleLabels[user.role]}
        />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
