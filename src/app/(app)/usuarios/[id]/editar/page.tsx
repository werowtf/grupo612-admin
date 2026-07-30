import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/user-form";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function EditarUsuarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reset?: string }>;
}) {
  const { user } = await getAppContext();
  if (user.role !== "ADMIN") notFound();

  const { id } = await params;
  const { reset } = await searchParams;

  const [target, venues] = await Promise.all([
    prisma.user.findUnique({ where: { id }, include: { venues: true } }),
    prisma.venue.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  if (!target) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-fg)]">
          <ArrowLeft className="h-4 w-4" />
          Usuarios
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Editar usuario</h1>
        <p className="text-sm text-[var(--color-muted)]">{target.email}</p>
      </div>

      <UserForm
        venues={venues.map((v) => ({ id: v.id, name: v.name }))}
        mode="edit"
        userId={target.id}
        initial={{
          name: target.name,
          email: target.email,
          role: target.role,
          active: target.active,
          venueIds: target.venues.map((v) => v.venueId),
        }}
      />

      <ResetPasswordForm userId={target.id} justReset={reset === "1"} />
    </div>
  );
}
