import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { UserForm } from "@/components/user-form";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { DeleteUserButton } from "@/components/delete-user-button";

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

  const isSelf = target.id === user.id;
  let canDelete = !isSelf;
  if (canDelete && target.role === "ADMIN" && target.active) {
    const otherAdmins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (otherAdmins === 0) canDelete = false;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/usuarios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Usuarios
        </Link>
        <h1 className="mt-1 text-xl">Editar usuario</h1>
        <p className="text-sm text-muted-foreground">{target.email}</p>
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

      {canDelete && (
        <div className="card space-y-2 p-5">
          <h2 className="text-base font-semibold">Zona de peligro</h2>
          <p className="text-sm text-muted-foreground">
            Elimina permanentemente a este usuario. Su historial de cortes, movimientos y
            documentos se conserva, pero perderá acceso a la plataforma de inmediato.
          </p>
          <DeleteUserButton userId={target.id} userName={target.name} />
        </div>
      )}
    </div>
  );
}
