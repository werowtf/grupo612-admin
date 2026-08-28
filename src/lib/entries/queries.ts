import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EntryType } from "@/generated/prisma/enums";
import { DEFAULT_EGRESO_CATEGORIES, DEFAULT_INGRESO_CATEGORIES } from "./config";

function num(v: { toString(): string } | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface EntrySummary {
  ingresos: number;
  egresos: number;
  neto: number;
  count: number;
}

export async function getEntrySummary(venueId: string): Promise<EntrySummary> {
  const [ing, egr, count] = await Promise.all([
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { venueId, type: "INGRESO" } }),
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { venueId, type: "EGRESO" } }),
    prisma.financialEntry.count({ where: { venueId } }),
  ]);
  const ingresos = num(ing._sum.amount);
  const egresos = num(egr._sum.amount);
  return { ingresos, egresos, neto: ingresos - egresos, count };
}

export interface EntryFilters {
  type?: EntryType;
  category?: string;
  search?: string;
  createdById?: string;
  take?: number;
}

export async function getVenueEntries(venueId: string, filters: EntryFilters = {}) {
  const where: Prisma.FinancialEntryWhereInput = {
    venueId,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.createdById ? { createdById: filters.createdById } : {}),
    ...(filters.search
      ? {
          OR: [
            { description: { contains: filters.search, mode: "insensitive" } },
            { supplier: { contains: filters.search, mode: "insensitive" } },
            { folio: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.financialEntry.findMany({
      where,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      take: filters.take ?? 200,
    }),
    prisma.financialEntry.count({ where }),
  ]);
  return { rows, total };
}

/**
 * Conceptos activos del negocio, en el orden configurado. Si el negocio aún no
 * tiene catálogo (se dio de alta antes de esta función), devuelve la lista por
 * defecto para que el selector nunca aparezca vacío.
 */
export async function getVenueCategories(
  venueId: string,
): Promise<Record<EntryType, string[]>> {
  const rows = await prisma.entryCategory.findMany({
    where: { venueId, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const out: Record<EntryType, string[]> = { INGRESO: [], EGRESO: [] };
  for (const r of rows) out[r.type].push(r.name);
  if (!out.INGRESO.length) out.INGRESO = [...DEFAULT_INGRESO_CATEGORIES];
  if (!out.EGRESO.length) out.EGRESO = [...DEFAULT_EGRESO_CATEGORIES];
  return out;
}
