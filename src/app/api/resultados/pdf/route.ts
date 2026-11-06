import { getAppContext } from "@/lib/context";
import { getEstadoResultados } from "@/lib/resultados/queries";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderStatementPdf } from "@/lib/resultados/pdf";
import { VENUE_LOGOS_PNG } from "@/lib/venue-logos";

export const dynamic = "force-dynamic";

/** El estado de resultados lo ven quienes llevan la operación y la contabilidad. */
const ALLOWED_ROLES = ["ADMIN", "GERENTE", "CONTADOR"];

/** Estado de resultados del negocio seleccionado y el mes pedido, en PDF. */
export async function GET(req: Request) {
  const { user, selected } = await getAppContext();
  if (!ALLOWED_ROLES.includes(user.role)) return new Response("No autorizado", { status: 403 });
  if (!selected) return new Response("Sin negocios", { status: 400 });

  const m = /^(\d{4})-(\d{2})$/.exec(new URL(req.url).searchParams.get("mes") ?? "");
  const now = new Date();
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const month = m ? Number(m[2]) : now.getUTCMonth() + 1;

  const statement = await getEstadoResultados(selected, year, month);
  // Logo del negocio (PNG en /public); si no tiene o no se puede leer, el PDF sale sin logo.
  let logoPng: Uint8Array | null = null;
  const logoPath = VENUE_LOGOS_PNG[selected.slug];
  if (logoPath) {
    try {
      logoPng = await readFile(path.join(process.cwd(), "public", logoPath));
    } catch {
      logoPng = null;
    }
  }
  const bytes = await renderStatementPdf({ venueName: selected.name, year, month, statement, logoPng });

  const name = `resultados-${selected.slug}-${year}-${String(month).padStart(2, "0")}.pdf`;
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
