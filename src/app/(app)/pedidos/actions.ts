"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { IVA_RATE } from "@/lib/pedidos/queries";

export interface PedidosActionState {
  error?: string;
  ok?: boolean;
}

const PUEDEN_EDITAR: UserRole[] = ["ADMIN", "GERENTE", "CONTADOR"];

async function requireEditor(venueId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  if (!PUEDEN_EDITAR.includes(user.role)) throw new Error("No autorizado");
  await assertVenueAccess(user, venueId);
  return user;
}

function revalidate() {
  revalidatePath("/pedidos");
  revalidatePath("/ingresos-egresos");
}

/**
 * Guarda de golpe todas las cantidades capturadas de un café/mes. Los campos
 * llegan como `qty_{productoId}_{day}`; sólo se escriben los productos que
 * pertenecen al café (evita que alguien manipule el formulario para escribir
 * en otro café), y una cantidad en 0 borra el pedido de ese día en vez de
 * dejar una fila en cero.
 */
export async function savePedidosAction(
  _prev: PedidosActionState,
  formData: FormData,
): Promise<PedidosActionState> {
  const cafeteriaId = String(formData.get("cafeteriaId") ?? "");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!cafeteriaId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return { error: "Datos inválidos." };
  }

  try {
    const cafeteria = await prisma.cafeteria.findUnique({ where: { id: cafeteriaId } });
    if (!cafeteria) return { error: "Café no encontrado." };
    const user = await requireEditor(cafeteria.venueId);

    const factura = await prisma.facturaCafeteria.findUnique({
      where: { cafeteriaId_year_month: { cafeteriaId, year, month } },
    });
    if (factura) return { error: "Este mes ya fue facturado. No se puede editar." };

    const productos = await prisma.productoCafeteria.findMany({ where: { cafeteriaId } });
    const priceById = new Map(productos.map((p) => [p.id, Number(p.price.toString())]));

    const toUpsert: { productoId: string; day: number; quantity: number }[] = [];
    const toDelete: { productoId: string; day: number }[] = [];
    for (const [key, raw] of formData.entries()) {
      const m = /^qty_([^_]+)_(\d+)$/.exec(key);
      if (!m) continue;
      const productoId = m[1];
      const day = Number(m[2]);
      if (!priceById.has(productoId)) continue;
      const quantity = Math.max(0, Math.trunc(Number(raw) || 0));
      if (quantity > 0) toUpsert.push({ productoId, day, quantity });
      else toDelete.push({ productoId, day });
    }

    await prisma.$transaction(async (tx) => {
      for (const row of toUpsert) {
        const date = new Date(Date.UTC(year, month - 1, row.day));
        await tx.pedidoCafeteria.upsert({
          where: { cafeteriaId_productoId_date: { cafeteriaId, productoId: row.productoId, date } },
          update: { quantity: row.quantity, unitPrice: priceById.get(row.productoId)! },
          create: {
            cafeteriaId,
            productoId: row.productoId,
            date,
            quantity: row.quantity,
            unitPrice: priceById.get(row.productoId)!,
          },
        });
      }
      for (const row of toDelete) {
        const date = new Date(Date.UTC(year, month - 1, row.day));
        await tx.pedidoCafeteria
          .delete({ where: { cafeteriaId_productoId_date: { cafeteriaId, productoId: row.productoId, date } } })
          .catch(() => {});
      }
    });

    await logAudit({
      userId: user.id,
      action: "pedidoCafeteria.save",
      entity: "Cafeteria",
      entityId: cafeteriaId,
      meta: { year, month, celdas: toUpsert.length },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar pedidos:", err);
    return { error: "No se pudieron guardar los pedidos." };
  }
}

/**
 * Marca un café/mes como facturado: calcula el total con IVA a partir de los
 * pedidos ya capturados y crea el Ingreso correspondiente en Ingresos y
 * egresos del negocio (Comisariato). Es idempotente por el único
 * cafeteriaId+year+month: no se puede facturar el mismo mes dos veces.
 */
export async function marcarFacturadoAction(
  cafeteriaId: string,
  year: number,
  month: number,
): Promise<PedidosActionState> {
  try {
    const cafeteria = await prisma.cafeteria.findUnique({ where: { id: cafeteriaId } });
    if (!cafeteria) return { error: "Café no encontrado." };
    const user = await requireEditor(cafeteria.venueId);

    const existing = await prisma.facturaCafeteria.findUnique({
      where: { cafeteriaId_year_month: { cafeteriaId, year, month } },
    });
    if (existing) return { error: "Este mes ya fue facturado." };

    const gte = new Date(Date.UTC(year, month - 1, 1));
    const lt = new Date(Date.UTC(year, month, 1));
    const pedidos = await prisma.pedidoCafeteria.findMany({ where: { cafeteriaId, date: { gte, lt } } });
    if (pedidos.length === 0) return { error: "No hay pedidos capturados en este mes." };

    const subtotal = pedidos.reduce((sum, p) => sum + p.quantity * Number(p.unitPrice.toString()), 0);
    const total = subtotal * (1 + IVA_RATE);

    await prisma.$transaction(async (tx) => {
      const entry = await tx.financialEntry.create({
        data: {
          venueId: cafeteria.venueId,
          type: "INGRESO",
          date: new Date(Date.UTC(year, month, 0)), // último día del mes facturado
          amount: total,
          category: "Cafetería",
          description: `Facturación ${cafeteria.name} — ${month}/${year}`,
          source: "SISTEMA",
          createdById: user.id,
        },
      });
      await tx.facturaCafeteria.create({
        data: { cafeteriaId, year, month, amount: total, entryId: entry.id, createdById: user.id },
      });
    });

    await logAudit({
      userId: user.id,
      action: "facturaCafeteria.crear",
      entity: "Cafeteria",
      entityId: cafeteriaId,
      meta: { year, month, total },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al facturar cafetería:", err);
    return { error: "No se pudo facturar." };
  }
}

/**
 * Guarda los folios de factura diarios (vista "Todos"): una sola factura al
 * día cubre los 3 cafés juntos, así que el folio se guarda a nivel de
 * negocio y no de café. Los campos llegan como `folio_{day}`; un folio
 * vacío borra el registro de ese día.
 */
export async function saveFoliosAction(
  _prev: PedidosActionState,
  formData: FormData,
): Promise<PedidosActionState> {
  const venueId = String(formData.get("venueId") ?? "");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!venueId || !Number.isInteger(year) || !Number.isInteger(month)) {
    return { error: "Datos inválidos." };
  }

  try {
    const user = await requireEditor(venueId);

    const toUpsert: { day: number; folio: string }[] = [];
    const toDelete: number[] = [];
    for (const [key, raw] of formData.entries()) {
      const m = /^folio_(\d+)$/.exec(key);
      if (!m) continue;
      const day = Number(m[1]);
      const folio = String(raw).trim();
      if (folio) toUpsert.push({ day, folio });
      else toDelete.push(day);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of toUpsert) {
        const date = new Date(Date.UTC(year, month - 1, row.day));
        await tx.folioPedidoCafeteria.upsert({
          where: { venueId_date: { venueId, date } },
          update: { folio: row.folio },
          create: { venueId, date, folio: row.folio },
        });
      }
      for (const day of toDelete) {
        const date = new Date(Date.UTC(year, month - 1, day));
        await tx.folioPedidoCafeteria.delete({ where: { venueId_date: { venueId, date } } }).catch(() => {});
      }
    });

    await logAudit({
      userId: user.id,
      action: "folioPedidoCafeteria.save",
      entity: "Venue",
      entityId: venueId,
      meta: { year, month, celdas: toUpsert.length },
    });
    revalidate();
    return { ok: true };
  } catch (err) {
    console.error("Error al guardar folios:", err);
    return { error: "No se pudieron guardar los folios." };
  }
}
