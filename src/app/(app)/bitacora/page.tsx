import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMXN } from "@/lib/utils";
import { categoryLabels, statusLabels, roleLabels, documentCategoryLabels } from "@/lib/labels";
import { entryTypeLabels } from "@/lib/entries/config";
import type { Prisma } from "@/generated/prisma/client";
import type {
  TxCategory,
  TxStatus,
  UserRole,
  DocumentCategory,
  EntryType,
} from "@/generated/prisma/enums";

const actionLabels: Record<string, string> = {
  "auth.login": "Inició sesión",
  "auth.logout": "Cerró sesión",
  "statement.import": "Importó estado de cuenta",
  "tx.recategorize": "Reclasificó movimiento",
  "tx.setStatus": "Cambió estatus de movimiento",
  "entry.create": "Registró movimiento",
  "entry.update": "Editó movimiento",
  "entry.delete": "Eliminó movimiento",
  "corte.create": "Creó corte de caja",
  "corte.update": "Editó corte de caja",
  "corte.delete": "Eliminó corte de caja",
  "corte.linkDeposit": "Vinculó depósito a un corte",
  "corte.unlinkDeposit": "Desvinculó depósito de un corte",
  "corte.autoMatch": "Auto-conciliación de corte",
  "document.upload": "Subió documento",
  "document.delete": "Eliminó documento",
  "user.create": "Creó usuario",
  "user.update": "Editó usuario",
  "user.resetPassword": "Restableció contraseña",
  "user.toggleActive": "Cambió estado de usuario",
};

const corteSourceLabels: Record<string, string> = {
  MANUAL: "Manual",
  EXCEL: "Excel",
  OCR: "Foto",
};

/** Traduce el `meta` (JSON crudo) de cada acción a una frase legible. */
function formatDetail(action: string, meta: Prisma.JsonValue | null): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const m = meta as Record<string, unknown>;

  switch (action) {
    case "statement.import": {
      const parts = [`"${m.fileName}"`, `${m.imported} importados`];
      if (typeof m.duplicates === "number" && m.duplicates > 0) {
        parts.push(`${m.duplicates} duplicados omitidos`);
      }
      return parts.join(" · ");
    }
    case "tx.recategorize": {
      const from = categoryLabels[m.from as TxCategory] ?? String(m.from);
      const to = categoryLabels[m.to as TxCategory] ?? String(m.to);
      return `${from} → ${to}`;
    }
    case "tx.setStatus": {
      const from = statusLabels[m.from as TxStatus] ?? String(m.from);
      const to = statusLabels[m.to as TxStatus] ?? String(m.to);
      return `${from} → ${to}`;
    }
    case "entry.create": {
      const type = entryTypeLabels[m.type as EntryType] ?? String(m.type);
      const amount = typeof m.amount === "number" ? formatMXN(m.amount) : String(m.amount);
      return [type, amount, m.category].filter(Boolean).join(" · ");
    }
    case "corte.create": {
      const source = corteSourceLabels[m.source as string] ?? String(m.source);
      return m.folio ? `${source} · Folio ${m.folio}` : source;
    }
    case "corte.autoMatch": {
      const amount = typeof m.amount === "number" ? formatMXN(m.amount) : String(m.amount);
      return `Depósito por ${amount}`;
    }
    case "document.upload": {
      const category = documentCategoryLabels[m.category as DocumentCategory] ?? String(m.category);
      return `"${m.fileName}" · ${category}`;
    }
    case "user.create": {
      const role = roleLabels[m.role as UserRole] ?? String(m.role);
      return `${m.email} · ${role}`;
    }
    case "user.update": {
      const role = roleLabels[m.role as UserRole] ?? String(m.role);
      return `${role} · ${m.active ? "Activo" : "Inactivo"}`;
    }
    case "user.toggleActive":
      return m.active ? "Activado" : "Desactivado";
    default:
      return "";
  }
}

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
        <p className="text-sm text-muted-foreground">
          Registro de acciones realizadas en la plataforma
        </p>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 font-medium">Usuario</th>
                <th className="px-3 py-2 font-medium">Acción</th>
                <th className="px-3 py-2 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/60">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {formatDate(l.createdAt)}{" "}
                      {l.createdAt.toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2">{l.user?.name ?? "—"}</td>
                    <td className="px-3 py-2">{actionLabels[l.action] ?? l.action}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDetail(l.action, l.meta)}
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
