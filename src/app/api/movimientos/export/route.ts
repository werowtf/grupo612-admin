import ExcelJS from "exceljs";
import { getAppContext } from "@/lib/context";
import { getVenueTransactions, type TxFilters } from "@/lib/queries";
import { categoryLabels, statusLabels } from "@/lib/labels";
import { txMerchant } from "@/lib/import/merchant";
import type { TxCategory, TxDirection, TxStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const CATEGORIES: TxCategory[] = ["DEPOSITO", "TRANSFERENCIA", "GASTO_TARJETA", "CHEQUE", "COMISION"];
const STATUSES: TxStatus[] = ["PENDIENTE", "CONCILIADO", "IGNORADO"];

function pick<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Excel de los movimientos bancarios del mes, con los mismos filtros que la pantalla. */
export async function GET(req: Request) {
  const { selected } = await getAppContext();
  if (!selected) return new Response("Sin negocios", { status: 400 });

  const sp = new URL(req.url).searchParams;
  const m = /^(\d{4})-(\d{2})$/.exec(sp.get("mes") ?? "");
  const now = new Date();
  const year = m ? Number(m[1]) : now.getUTCFullYear();
  const month = m ? Number(m[2]) : now.getUTCMonth() + 1;

  const filters: TxFilters = {
    category: pick<TxCategory>(sp.get("category"), CATEGORIES),
    direction: pick<TxDirection>(sp.get("direction"), ["CARGO", "ABONO"]),
    status: pick<TxStatus>(sp.get("status"), STATUSES),
    search: sp.get("search")?.trim() || undefined,
    dateFrom: new Date(Date.UTC(year, month - 1, 1)),
    dateTo: new Date(Date.UTC(year, month, 1)),
    take: 50000,
  };
  const { rows } = await getVenueTransactions(selected.id, filters);
  // La pantalla ordena de más reciente a más antiguo; en el Excel va cronológico.
  rows.reverse();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Movimientos", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Fecha", key: "fecha", width: 12, style: { numFmt: "dd/mm/yyyy" } },
    { header: "Hora", key: "hora", width: 9 },
    { header: "Descripción", key: "descripcion", width: 60 },
    { header: "Comercio", key: "comercio", width: 34 },
    { header: "Categoría", key: "categoria", width: 16 },
    { header: "Cargo", key: "cargo", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Abono", key: "abono", width: 14, style: { numFmt: "#,##0.00" } },
    { header: "Estatus", key: "estatus", width: 13 },
    { header: "Referencia", key: "referencia", width: 18 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).alignment = { vertical: "middle" };

  let cargos = 0;
  let abonos = 0;
  for (const t of rows) {
    const amount = Number(t.amount.toString());
    const cargo = t.direction === "CARGO" ? amount : null;
    const abono = t.direction === "ABONO" ? amount : null;
    cargos += cargo ?? 0;
    abonos += abono ?? 0;
    ws.addRow({
      fecha: t.date,
      hora: t.time ?? "",
      descripcion: t.descriptionLong || t.description,
      comercio: txMerchant({ description: t.description, concept: t.concept, counterpartyName: t.counterpartyName }) ?? "",
      categoria: categoryLabels[t.category],
      cargo,
      abono,
      estatus: statusLabels[t.status],
      referencia: t.reference ?? "",
    });
  }
  const total = ws.addRow({ descripcion: `Total · ${rows.length} movimientos`, cargo: cargos, abono: abonos });
  total.font = { bold: true };
  ws.autoFilter = { from: "A1", to: "I1" };

  const buffer = await wb.xlsx.writeBuffer();
  const mes = `${year}-${String(month).padStart(2, "0")}`;
  const name = `movimientos-${selected.slug}-${mes}.xlsx`;
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
