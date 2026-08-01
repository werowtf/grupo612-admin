import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { roleLabels } from "@/lib/labels";
import { ToggleActiveButton } from "@/components/toggle-active-button";

export default async function UsuariosPage() {
  const { user } = await getAppContext();
  if (user.role !== "ADMIN") notFound();

  const users = await prisma.user.findMany({
    include: { venues: { include: { venue: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuarios</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Usuarios con acceso a la plataforma
          </p>
        </div>
        <Link href="/usuarios/nuevo" className="btn-primary">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Link>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50 text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-3 py-2 font-medium">Nombre</th>
                <th className="px-3 py-2 font-medium">Correo</th>
                <th className="px-3 py-2 font-medium">Rol</th>
                <th className="px-3 py-2 font-medium">Negocios</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2 font-medium">
                    <Link href={`/usuarios/${u.id}/editar`} className="hover:text-brand-700 hover:underline">
                      {u.name}
                    </Link>
                    {u.id === user.id && (
                      <span className="ml-1.5 text-xs text-[var(--color-muted)]">(tú)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">{u.email}</td>
                  <td className="px-3 py-2">{roleLabels[u.role]}</td>
                  <td className="px-3 py-2 text-[var(--color-muted)]">
                    {u.role === "ADMIN"
                      ? "Todas"
                      : u.venues.map((v) => v.venue.name).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <ToggleActiveButton userId={u.id} active={u.active} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/usuarios/${u.id}/editar`} className="text-xs text-brand-600 hover:underline">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
