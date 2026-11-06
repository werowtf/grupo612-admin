import "server-only";
import { prisma } from "@/lib/prisma";
import { COMISION_NOMINA_ADMIN } from "@/lib/comisiones/config";
import {
  buildStatement,
  emptyCells,
  EXCLUDED_EGRESO_CATEGORIES,
  EXCLUDED_INGRESO_CATEGORIES,
  type Cells,
  type PayIndex,
  type Statement,
} from "./statement";
import type { PaymentMethod } from "@/generated/prisma/enums";

const PAY_INDEX: Record<PaymentMethod, PayIndex> = {
  EFECTIVO: 0,
  TARJETA: 1,
  TRANSFERENCIA: 3,
  CHEQUE: 4,
  OTRO: 4,
};

const num = (v: { toString(): string } | null | undefined) => (v ? Number(v.toString()) : 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Estado de resultados del negocio en el mes (la misma estructura que el libro contable). */
export async function getEstadoResultados(
  venue: { id: string; slug: string },
  year: number,
  month: number,
): Promise<Statement> {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1)); // exclusivo

  const [ventasRows, entries, bank] = await Promise.all([
    prisma.dailySale.findMany({
      where: { venueId: venue.id, date: { gte: from, lt: to } },
      select: { efectivo: true, tarjeta: true, credito: true, comida: true, bebida: true },
    }),
    prisma.financialEntry.groupBy({
      by: ["type", "category", "paymentMethod"],
      where: { venueId: venue.id, date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.bankTransaction.groupBy({
      by: ["direction"],
      where: {
        bankAccount: { venueId: venue.id },
        category: "COMISION",
        status: { not: "IGNORADO" },
        date: { gte: from, lt: to },
      },
      _sum: { amount: true },
    }),
  ]);

  const ventas = emptyCells();
  let comida = 0;
  let bebida = 0;
  for (const r of ventasRows) {
    ventas[0] += num(r.efectivo);
    ventas[1] += num(r.tarjeta);
    ventas[2] += num(r.credito);
    comida += num(r.comida);
    bebida += num(r.bebida);
  }

  const otrosIngresos = emptyCells();
  const egresos = new Map<string, Cells>();
  const excludedIngreso = new Set<string>(EXCLUDED_INGRESO_CATEGORIES);
  const excludedEgreso = new Set<string>(EXCLUDED_EGRESO_CATEGORIES);
  for (const e of entries) {
    const amount = num(e._sum.amount);
    const idx = PAY_INDEX[e.paymentMethod];
    if (e.type === "INGRESO") {
      if (!excludedIngreso.has(e.category)) otrosIngresos[idx] += amount;
    } else if (!excludedEgreso.has(e.category)) {
      const cells = egresos.get(e.category) ?? emptyCells();
      cells[idx] += amount;
      egresos.set(e.category, cells);
    }
  }

  const cargos = num(bank.find((b) => b.direction === "CARGO")?._sum.amount);
  const abonos = num(bank.find((b) => b.direction === "ABONO")?._sum.amount);

  const ventaTotal = ventas[0] + ventas[1] + ventas[2];
  const nominaAdmin = r2(ventaTotal * (COMISION_NOMINA_ADMIN[venue.slug] ?? 0));

  return buildStatement({
    ventas,
    comida,
    bebida,
    otrosIngresos,
    egresos,
    comisionesBanco: r2(cargos - abonos),
    nominaAdmin,
  });
}
