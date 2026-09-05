import "server-only";
import { prisma } from "@/lib/prisma";

/** Tasa de IVA aplicada a la venta de la cafetería. */
export const IVA_RATE = 0.16;

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export async function getCafeterias(venueId: string) {
  return prisma.cafeteria.findMany({
    where: { venueId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getProductosCafeteria(cafeteriaId: string, opts?: { includeInactive?: boolean }) {
  return prisma.productoCafeteria.findMany({
    where: { cafeteriaId, ...(opts?.includeInactive ? {} : { active: true }) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export interface PedidoCell {
  productoId: string;
  day: number; // 1-31
  quantity: number;
}

/** Pedidos de un café en un mes, listos para poblar la rejilla producto×día. */
export async function getPedidosMes(cafeteriaId: string, year: number, month: number): Promise<PedidoCell[]> {
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));
  const pedidos = await prisma.pedidoCafeteria.findMany({
    where: { cafeteriaId, date: { gte, lt } },
  });
  return pedidos.map((p) => ({
    productoId: p.productoId,
    day: p.date.getUTCDate(),
    quantity: p.quantity,
  }));
}

export async function getFacturaMes(cafeteriaId: string, year: number, month: number) {
  return prisma.facturaCafeteria.findUnique({
    where: { cafeteriaId_year_month: { cafeteriaId, year, month } },
  });
}

/** Total con IVA de un café/mes, a partir de los pedidos capturados (precio congelado). */
export async function calcularTotalMes(cafeteriaId: string, year: number, month: number): Promise<number> {
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));
  const pedidos = await prisma.pedidoCafeteria.findMany({
    where: { cafeteriaId, date: { gte, lt } },
  });
  const subtotal = pedidos.reduce((sum, p) => sum + p.quantity * num(p.unitPrice), 0);
  return subtotal * (1 + IVA_RATE);
}
