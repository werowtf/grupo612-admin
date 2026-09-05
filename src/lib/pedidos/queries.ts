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

export interface ProductoResumen {
  name: string;
  price: number;
}

export interface PedidosResumen {
  productos: ProductoResumen[];
  /** clave `${nombreProducto}_${día}` -> cantidad sumada de los 3 cafés */
  quantities: Record<string, number>;
  /** total en dinero por día (día 1 en el índice 0), suma de los cafés */
  dailyTotals: number[];
  subtotal: number;
  totalConIva: number;
}

/**
 * Vista de solo lectura "Todos": suma los pedidos de todos los cafés del
 * negocio, agrupando por nombre de producto (no por café), para ver el
 * consolidado del mes. Los montos se calculan con el precio congelado de
 * cada pedido, así que son exactos aunque el precio difiera entre cafés.
 */
export async function getPedidosMesTodos(venueId: string, year: number, month: number): Promise<PedidosResumen> {
  const cafeterias = await getCafeterias(venueId);
  const cafeteriaIds = cafeterias.map((c) => c.id);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));

  const [productos, pedidos] = await Promise.all([
    prisma.productoCafeteria.findMany({ where: { cafeteriaId: { in: cafeteriaIds } } }),
    prisma.pedidoCafeteria.findMany({
      where: { cafeteriaId: { in: cafeteriaIds }, date: { gte, lt } },
      include: { producto: true },
    }),
  ]);

  const productoInfo = new Map<string, { price: number; sortOrder: number }>();
  for (const p of productos) {
    if (!productoInfo.has(p.name)) productoInfo.set(p.name, { price: num(p.price), sortOrder: p.sortOrder });
  }

  const quantities: Record<string, number> = {};
  const dailyTotals = new Array(daysInMonth).fill(0);
  let subtotal = 0;
  for (const pedido of pedidos) {
    const name = pedido.producto.name;
    const day = pedido.date.getUTCDate();
    const key = `${name}_${day}`;
    quantities[key] = (quantities[key] ?? 0) + pedido.quantity;
    const amount = pedido.quantity * num(pedido.unitPrice);
    dailyTotals[day - 1] += amount;
    subtotal += amount;
  }

  const productosList = [...productoInfo.entries()]
    .sort((a, b) => a[1].sortOrder - b[1].sortOrder || a[0].localeCompare(b[0]))
    .map(([name, info]) => ({ name, price: info.price }));

  return { productos: productosList, quantities, dailyTotals, subtotal, totalConIva: subtotal * (1 + IVA_RATE) };
}

/** Folios de factura diarios de un negocio/mes: día (1-31) -> folio. Una factura al día cubre los 3 cafés juntos. */
export async function getFoliosMes(venueId: string, year: number, month: number): Promise<Record<number, string>> {
  const gte = new Date(Date.UTC(year, month - 1, 1));
  const lt = new Date(Date.UTC(year, month, 1));
  const folios = await prisma.folioPedidoCafeteria.findMany({ where: { venueId, date: { gte, lt } } });
  const result: Record<number, string> = {};
  for (const f of folios) result[f.date.getUTCDate()] = f.folio;
  return result;
}
