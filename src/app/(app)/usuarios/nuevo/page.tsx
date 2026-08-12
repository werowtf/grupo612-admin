import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/user-form";

export default async function NuevoUsuarioPage() {
  const { user } = await getAppContext();
  if (user.role !== "ADMIN") notFound();

  const venues = await prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-[var(--color-fg)]">
          <ArrowLeft className="h-4 w-4" />
          Usuarios
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Nuevo usuario</h1>
      </div>

      <UserForm venues={venues.map((v) => ({ id: v.id, name: v.name }))} mode="create" />
    </div>
  );
}
