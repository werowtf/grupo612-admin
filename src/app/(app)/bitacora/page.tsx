import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  "auth.login": "Inició sesión",
  "auth.logout": "Cerró sesión",
  "statement.import": "Importó estado de cuenta",
  "tx.recategorize": "Reclasificó movimiento",
  "tx.setStatus": "Cambió estatus de movimiento",
};

export default async function BitacoraPage() {
  const { user } = await getAppContext();
  if (user.role !== "ADMIN") notFound();

  const logs = await prisma.auditLog.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Logs</h1>
        <p className="text-sm text-[var(--color-muted)]">
          Registro de acciones realizadas en la plataforma
        </p>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-gray-50 text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Usuario</th>
                <th className="px-3 py-2 font-medium">Acción</th>
                <th className="px-3 py-2 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[var(--color-muted)]">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50/60">
                    <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted)]">
                      {formatDate(l.createdAt)}{" "}
                      {l.createdAt.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">{l.user?.name ?? "—"}</td>
                    <td className="px-3 py-2">{actionLabels[l.action] ?? l.action}</td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      {l.meta ? JSON.stringify(l.meta) : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
