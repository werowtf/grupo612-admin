import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}
const r2 = (n: number) => Math.round(n * 100) / 100;

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface CategoryTotal {
  category: string;
  total: number;
}

export interface MonthlyReport {
  period: { year: number; month: number; label: string; start: Date; end: Date };
  ventas: {
    total: number;
    efectivo: number;
    visa: number;
    mastercard: number;
    amex: number;
    /** Tarjeta manual: no se sabe la marca, así que no entra en visa/mastercard/amex. */
    tarjetaManual: number;
    tarjeta: number;
    alimentos: number;
    bebidas: number;
    propinas: number;
    iva: number;
    cortes: number;
    /** Días capturados a mano en Venta diaria (sin corte de caja ese día). */
    diasManual: number;
  };
  banco: {
    abonos: number;
    cargos: number;
    comisiones: number;
    cargosByCategory: CategoryTotal[];
  };
  finanzas: {
    ingresos: number;
    egresos: number;
    neto: number;
    egresosByCategory: CategoryTotal[];
  };
  conciliacion: {
    cortesConTarjeta: number;
    cortesConciliados: number;
    tarjetaEsperada: number;
    depositado: number;
  };
}

export async function getMonthlyReport(
  venueIds: string[],
  year: number,
  month: number,
): Promise<MonthlyReport> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // exclusivo
  const inPeriod = { gte: start, lt: end };

  // ── Ventas (cortes de caja) ──────────────────────────────────
  const corteWhere: Prisma.CorteWhereInput = { venueId: { in: venueIds }, date: inPeriod };
  const corteAgg = await prisma.corte.aggregate({
    where: corteWhere,
    _sum: {
      totalVenta: true,
      pagoEfectivo: true,
      pagoVisa: true,
      pagoMastercard: true,
      pagoAmex: true,
      ventaAlimentos: true,
      ventaBebidas: true,
      totalPropinas: true,
      iva: true,
    },
    _count: true,
  });
  const visa = num(corteAgg._sum.pagoVisa);
  const mc = num(corteAgg._sum.pagoMastercard);
  const amex = num(corteAgg._sum.pagoAmex);

  // ── Venta diaria capturada a mano (días sin corte de caja) ───
  // Los días con corte no se tocan aquí: DailySale.source="CORTE" es un
  // espejo del corte, ya contado arriba — sumarlo también sería duplicar.
  const manualSales = await prisma.dailySale.findMany({
    where: { venueId: { in: venueIds }, date: inPeriod, source: "MANUAL" },
    select: { efectivo: true, tarjeta: true, credito: true, comida: true, bebida: true },
  });
  let manualEfectivo = 0;
  let manualTarjeta = 0;
  let manualTotal = 0;
  let manualAlimentos = 0;
  let manualBebidas = 0;
  for (const s of manualSales) {
    const ef = num(s.efectivo);
    const ta = num(s.tarjeta);
    const cr = num(s.credito);
    manualEfectivo += ef;
    manualTarjeta += ta;
    manualTotal += ef + ta + cr;
    manualAlimentos += num(s.comida);
    manualBebidas += num(s.bebida);
  }
  // La venta diaria trae el total con impuesto y comida/bebida sin impuesto
  // (igual que un corte), así que el IVA implícito es la diferencia.
  const manualIva = manualTotal - (manualAlimentos + manualBebidas);

  // ── Banco (movimientos) ──────────────────────────────────────
  const bankWhere: Prisma.BankTransactionWhereInput = {
    bankAccount: { venueId: { in: venueIds } },
    date: inPeriod,
  };
  const [bankAbonos, bankCargos, bankByCat] = await Promise.all([
    prisma.bankTransaction.aggregate({ _sum: { amount: true }, where: { ...bankWhere, direction: "ABONO" } }),
    prisma.bankTransaction.aggregate({ _sum: { amount: true }, where: { ...bankWhere, direction: "CARGO" } }),
    prisma.bankTransaction.groupBy({
      by: ["category"],
      where: { ...bankWhere, direction: "CARGO" },
      _sum: { amount: true },
    }),
  ]);
  const cargosByCategory = bankByCat
    .map((g) => ({ category: g.category, total: num(g._sum.amount) }))
    .sort((a, b) => b.total - a.total);
  const comisiones = cargosByCategory.find((c) => c.category === "COMISION")?.total ?? 0;

  // ── Finanzas (ingresos/egresos manuales) ─────────────────────
  const entryWhere: Prisma.FinancialEntryWhereInput = { venueId: { in: venueIds }, date: inPeriod };
  const [entryIng, entryEgr, egrByCat] = await Promise.all([
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { ...entryWhere, type: "INGRESO" } }),
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { ...entryWhere, type: "EGRESO" } }),
    prisma.financialEntry.groupBy({
      by: ["category"],
      where: { ...entryWhere, type: "EGRESO" },
      _sum: { amount: true },
    }),
  ]);
  const ingresos = num(entryIng._sum.amount);
  const egresos = num(entryEgr._sum.amount);
  const egresosByCategory = egrByCat
    .map((g) => ({ category: g.category, total: num(g._sum.amount) }))
    .sort((a, b) => b.total - a.total);

  // ── Conciliación (cortes vs depósitos) ───────────────────────
  const cortes = await prisma.corte.findMany({
    where: corteWhere,
    select: {
      pagoVisa: true,
      pagoMastercard: true,
      pagoAmex: true,
      deposits: { select: { amount: true } },
    },
  });
  let cortesConTarjeta = 0;
  let cortesConciliados = 0;
  let tarjetaEsperada = 0;
  let depositado = 0;
  for (const c of cortes) {
    const card = num(c.pagoVisa) + num(c.pagoMastercard) + num(c.pagoAmex);
    if (card <= 0) continue;
    cortesConTarjeta++;
    tarjetaEsperada += card;
    if (c.deposits.length > 0) {
      cortesConciliados++;
      depositado += c.deposits.reduce((s, d) => s + num(d.amount), 0);
    }
  }

  return {
    period: { year, month, label: `${MONTHS[month - 1]} ${year}`, start, end },
    ventas: {
      total: r2(num(corteAgg._sum.totalVenta) + manualTotal),
      efectivo: r2(num(corteAgg._sum.pagoEfectivo) + manualEfectivo),
      visa: r2(visa),
      mastercard: r2(mc),
      amex: r2(amex),
      tarjetaManual: r2(manualTarjeta),
      tarjeta: r2(visa + mc + amex + manualTarjeta),
      alimentos: r2(num(corteAgg._sum.ventaAlimentos) + manualAlimentos),
      bebidas: r2(num(corteAgg._sum.ventaBebidas) + manualBebidas),
      propinas: r2(num(corteAgg._sum.totalPropinas)),
      iva: r2(num(corteAgg._sum.iva) + manualIva),
      cortes: corteAgg._count,
      diasManual: manualSales.length,
    },
    banco: {
      abonos: r2(num(bankAbonos._sum.amount)),
      cargos: r2(num(bankCargos._sum.amount)),
      comisiones: r2(comisiones),
      cargosByCategory,
    },
    finanzas: {
      ingresos: r2(ingresos),
      egresos: r2(egresos),
      neto: r2(ingresos - egresos),
      egresosByCategory,
    },
    conciliacion: {
      cortesConTarjeta,
      cortesConciliados,
      tarjetaEsperada: r2(tarjetaEsperada),
      depositado: r2(depositado),
    },
  };
}
