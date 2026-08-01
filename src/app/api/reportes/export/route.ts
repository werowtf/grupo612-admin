import { getCurrentUser, getAccessibleVenues } from "@/lib/auth";
import { getMonthlyReport } from "@/lib/reports/queries";
import { categoryLabels } from "@/lib/labels";
import type { TxCategory } from "@/generated/prisma/enums";

function parseMonth(mes: string | null): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(mes ?? "");
  if (m) return { year: Number(m[1]), month: Number(m[2]) };
  const now = new Date();
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function csvRow(a: string, b: string | number): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return `${esc(a)},${esc(String(b))}`;
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("No autorizado", { status: 401 });

  const url = new URL(req.url);
  const { year, month } = parseMonth(url.searchParams.get("mes"));
  const venueParam = url.searchParams.get("venue") ?? "";

  const venues = await getAccessibleVenues(user);
  const consolidado = venueParam === "todas";
  let venueIds: string[];
  let scopeName: string;
  if (consolidado) {
    venueIds = venues.map((v) => v.id);
    scopeName = "Todas";
  } else {
    const venue = venues.find((v) => v.id === venueParam) ?? venues[0];
    if (!venue) return new Response("Sin negocios", { status: 400 });
    venueIds = [venue.id];
    scopeName = venue.name;
  }

  const r = await getMonthlyReport(venueIds, year, month);
  const lines: string[] = [];
  lines.push(csvRow("Reporte", `${scopeName} — ${r.period.label}`));
  lines.push("");
  lines.push(csvRow("Concepto", "Monto"));
  lines.push(csvRow("Ventas del mes", r.ventas.total));
  lines.push(csvRow("Ventas efectivo", r.ventas.efectivo));
  lines.push(csvRow("Ventas Visa", r.ventas.visa));
  lines.push(csvRow("Ventas Mastercard", r.ventas.mastercard));
  lines.push(csvRow("Ventas American Express", r.ventas.amex));
  lines.push(csvRow("Ventas con tarjeta", r.ventas.tarjeta));
  lines.push(csvRow("Ventas alimentos", r.ventas.alimentos));
  lines.push(csvRow("Ventas bebidas", r.ventas.bebidas));
  lines.push(csvRow("Propinas", r.ventas.propinas));
  lines.push(csvRow("IVA", r.ventas.iva));
  lines.push("");
  lines.push(csvRow("Banco — abonos", r.banco.abonos));
  lines.push(csvRow("Banco — cargos", r.banco.cargos));
  lines.push(csvRow("Banco — comisiones", r.banco.comisiones));
  for (const c of r.banco.cargosByCategory) {
    lines.push(csvRow(`Banco — ${categoryLabels[c.category as TxCategory] ?? c.category}`, c.total));
  }
  lines.push("");
  lines.push(csvRow("Ingresos registrados", r.finanzas.ingresos));
  lines.push(csvRow("Egresos registrados", r.finanzas.egresos));
  for (const c of r.finanzas.egresosByCategory) {
    lines.push(csvRow(`Egreso — ${c.category}`, c.total));
  }
  lines.push("");
  lines.push(csvRow("Tarjeta esperada (cortes)", r.conciliacion.tarjetaEsperada));
  lines.push(csvRow("Depositado en banco", r.conciliacion.depositado));
  lines.push(csvRow("Cortes con tarjeta", r.conciliacion.cortesConTarjeta));
  lines.push(csvRow("Cortes conciliados", r.conciliacion.cortesConciliados));

  const csv = "﻿" + lines.join("\r\n"); // BOM para acentos en Excel
  const fileName = `reporte-${scopeName.toLowerCase().replace(/\s+/g, "-")}-${year}-${String(month).padStart(2, "0")}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
