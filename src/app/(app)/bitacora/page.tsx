import Link from "next/link";
import { notFound } from "next/navigation";
import { getAppContext } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { formatMXN } from "@/lib/utils";
import { categoryLabels, statusLabels, roleLabels, documentCategoryLabels } from "@/lib/labels";
import { entryTypeLabels } from "@/lib/entries/config";
import { buttonVariants } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import type { TxCategory, TxStatus, UserRole, DocumentCategory, EntryType } from "@/generated/prisma/enums";

const PAGE_SIZE = 50;
const TZ = "America/Mazatlan";

const actionLabels: Record<string, string> = {
  "auth.login": "Inició sesión",
  "auth.logout": "Cerró sesión",
  "statement.import": "Importó estado de cuenta",
  "tx.recategorize": "Reclasificó movimiento bancario",
  "tx.setStatus": "Cambió estatus de movimiento bancario",
  "entry.create": "Registró ingreso/egreso",
  "entry.update": "Editó ingreso/egreso",
  "entry.delete": "Eliminó ingreso/egreso",
  "entryCategory.create": "Creó concepto",
  "entryCategory.rename": "Renombró concepto",
  "entryCategory.toggleActive": "Activó/desactivó concepto",
  "entryCategory.delete": "Eliminó concepto",
  "corte.create": "Creó corte de caja",
  "corte.update": "Editó corte de caja",
  "corte.delete": "Eliminó corte de caja",
  "corte.linkDeposit": "Vinculó depósito a un corte",
  "corte.unlinkDeposit": "Desvinculó depósito de un corte",
  "corte.autoMatch": "Auto-conciliación de corte",
  "corte.propinasPagadas": "Marcó propinas como pagadas",
  "corte.propinasPendientes": "Marcó propinas como pendientes",
  "dailySale.save": "Guardó venta diaria",
  "dailySale.delete": "Eliminó venta diaria",
  "dailySale.updateStatusCredito": "Anotó status de crédito",
  "cuentaPorPagar.create": "Creó cuenta por pagar",
  "cuentaPorPagar.editar": "Editó cuenta por pagar",
  "cuentaPorPagar.pagar": "Marcó cuenta por pagar como pagada",
  "cuentaPorPagar.eliminar": "Eliminó cuenta por pagar",
  "cajaChicaFondo.aprobar": "Aprobó fondo de caja chica",
  "cajaChicaFondo.editar": "Editó fondo de caja chica",
  "cajaChicaFondo.eliminar": "Eliminó fondo de caja chica",
  "cajaChicaGasto.crear": "Registró gasto de caja chica",
  "cajaChicaGasto.editar": "Editó gasto de caja chica",
  "cajaChicaGasto.eliminar": "Eliminó gasto de caja chica",
  "cajaChicaGasto.reembolsar": "Marcó gasto de caja chica como repuesto",
  "cajaChicaGasto.pendiente": "Marcó gasto de caja chica como pendiente",
  "oficinaCajaChicaFondo.aprobar": "Aprobó fondo de caja chica (Oficina)",
  "oficinaCajaChicaFondo.eliminar": "Eliminó fondo de caja chica (Oficina)",
  "oficinaCajaChicaGasto.crear": "Registró gasto de caja chica (Oficina)",
  "oficinaCajaChicaGasto.eliminar": "Eliminó gasto de caja chica (Oficina)",
  "oficinaCajaChicaGasto.reembolsar": "Marcó gasto de Oficina como repuesto",
  "oficinaCajaChicaGasto.pendiente": "Marcó gasto de Oficina como pendiente",
  "oficinaNota.crear": "Creó nota de Oficina",
  "oficinaNota.editar": "Editó nota de Oficina",
  "oficinaNota.eliminar": "Eliminó nota de Oficina",
  "pedidoCafeteria.save": "Guardó pedidos de cafetería",
  "folioPedidoCafeteria.save": "Guardó folios de pedidos",
  "folioPedidoCafeteria.estado": "Cambió estado de folio de pedido",
  "facturaCafeteria.crear": "Registró factura de cafetería",
  "productoCafeteria.create": "Creó producto de cafetería",
  "productoCafeteria.update": "Editó producto de cafetería",
  "productoCafeteria.toggleActive": "Activó/desactivó producto de cafetería",
  "prestamo.crear": "Prestó dinero entre negocios",
  "prestamo.reembolsar": "Reembolsó un préstamo entre negocios",
  "document.upload": "Subió documento",
  "document.delete": "Eliminó documento",
  "user.create": "Creó usuario",
  "user.update": "Editó usuario",
  "user.delete": "Eliminó usuario",
  "user.resetPassword": "Restableció contraseña",
  "user.toggleActive": "Cambió estado de usuario",
};

const corteSourceLabels: Record<string, string> = { MANUAL: "Manual", EXCEL: "Excel", OCR: "Foto" };

const money = (v: unknown) => (v == null || v === "" ? "" : formatMXN(Number(v)));

/** Traduce el `meta` (JSON crudo) de cada acción a una frase legible. */
function formatDetail(action: string, meta: Prisma.JsonValue | null, venues: Map<string, string>): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return "";
  const m = meta as Record<string, unknown>;
  const venue = typeof m.venueId === "string" ? venues.get(m.venueId) : undefined;
  let detail = "";

  switch (action) {
    case "statement.import": {
      const parts = [`"${m.fileName}"`, `${m.imported} importados`];
      if (typeof m.duplicates === "number" && m.duplicates > 0) parts.push(`${m.duplicates} duplicados omitidos`);
      detail = parts.join(" · ");
      break;
    }
    case "tx.recategorize":
      detail = `${categoryLabels[m.from as TxCategory] ?? String(m.from)} → ${categoryLabels[m.to as TxCategory] ?? String(m.to)}`;
      break;
    case "tx.setStatus":
      detail = `${statusLabels[m.from as TxStatus] ?? String(m.from)} → ${statusLabels[m.to as TxStatus] ?? String(m.to)}`;
      break;
    case "entry.create":
      detail = [entryTypeLabels[m.type as EntryType] ?? String(m.type), money(m.amount), m.category].filter(Boolean).join(" · ");
      break;
    case "corte.create": {
      const source = corteSourceLabels[m.source as string] ?? String(m.source);
      detail = m.folio ? `${source} · Folio ${m.folio}` : source;
      break;
    }
    case "corte.autoMatch":
      detail = `Depósito por ${money(m.amount)}`;
      break;
    case "corte.propinasPagadas":
    case "corte.propinasPendientes":
      detail = money(m.amount);
      break;
    case "document.upload":
      detail = `"${m.fileName}" · ${documentCategoryLabels[m.category as DocumentCategory] ?? String(m.category)}`;
      break;
    case "user.create":
      detail = `${m.email} · ${roleLabels[m.role as UserRole] ?? String(m.role)}`;
      break;
    case "user.update":
      detail = `${roleLabels[m.role as UserRole] ?? String(m.role)} · ${m.active ? "Activo" : "Inactivo"}`;
      break;
    case "user.delete":
      detail = [m.name, m.email].filter(Boolean).join(" · ");
      break;
    case "user.toggleActive":
      detail = m.active ? "Activado" : "Desactivado";
      break;
    case "entryCategory.create":
      detail = [m.name, entryTypeLabels[m.type as EntryType]].filter(Boolean).join(" · ");
      break;
    case "prestamo.crear":
    case "prestamo.reembolsar": {
      const from = typeof m.lenderVenueId === "string" ? venues.get(m.lenderVenueId) : undefined;
      const to = typeof m.borrowerVenueId === "string" ? venues.get(m.borrowerVenueId) : undefined;
      return [money(m.amount), from && to ? `${from} → ${to}` : ""].filter(Boolean).join(" · ");
    }
    default:
      if (action.startsWith("cuentaPorPagar.")) detail = [m.concept, money(m.amount)].filter(Boolean).join(" · ");
      else if (action.startsWith("cajaChica") || action.startsWith("oficinaCajaChica"))
        detail = [m.employee, money(m.amount)].filter(Boolean).join(" · ");
  }
  return [detail, venue].filter(Boolean).join(" — ");
}

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user } = await getAppContext();
  if (user.role !== "ADMIN") notFound();

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);

  const [total, logs, venueRows] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.venue.findMany({ select: { id: true, name: true } }),
  ]);
  const venues = new Map(venueRows.map((v) => [v.id, v.name]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fecha = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", timeZone: TZ });
  const hora = (d: Date) => d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: TZ });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl">Logs</h1>
        <p className="text-sm text-muted-foreground">
          Registro de acciones realizadas en la plataforma · {total.toLocaleString("es-MX")} registros
        </p>
      </header>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-table-header text-left text-[10px] uppercase tracking-wide text-brand-600">
                <th className="px-3 py-2 font-semibold">Fecha</th>
                <th className="px-3 py-2 font-semibold">Hora</th>
                <th className="px-3 py-2 font-semibold">Usuario</th>
                <th className="px-3 py-2 font-semibold">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                    Sin registros.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const detail = formatDetail(l.action, l.meta, venues);
                  return (
                    <tr key={l.id} className="hover:bg-muted/60">
                      <td className="whitespace-nowrap px-3 py-2 font-semibold text-muted-foreground">{fecha(l.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums text-muted-foreground">{hora(l.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-2">{l.user?.name ?? "—"}</td>
                      <td className="px-3 py-2">
                        {actionLabels[l.action] ?? l.action}
                        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
          <span>
            Página {page} de {pages}
          </span>
          {page > 1 ? (
            <Link href={`/bitacora?pagina=${page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Anterior
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>Anterior</span>
          )}
          {page < pages ? (
            <Link href={`/bitacora?pagina=${page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              Siguiente
            </Link>
          ) : (
            <span className={buttonVariants({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-50"}>Siguiente</span>
          )}
        </div>
      )}
    </div>
  );
}
