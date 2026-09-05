import { redirect } from "next/navigation";
import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { getSelectedVenue } from "@/lib/venue";
import { roleLabels } from "@/lib/labels";
import { AppShell } from "@/components/app-shell";

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
    <AppShell
      role={user.role}
      venues={venues.map((v) => ({ id: v.id, name: v.name }))}
      selectedVenueId={selected?.id ?? null}
      selectedVenueSlug={selected?.slug ?? null}
      userName={user.name}
      roleLabel={roleLabels[user.role]}
    >
      {children}
    </AppShell>
  );
}
