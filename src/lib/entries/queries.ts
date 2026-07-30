import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { EntryType } from "@/generated/prisma/enums";

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
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: filters.take ?? 200,
    }),
    prisma.financialEntry.count({ where }),
  ]);
  return { rows, total };
}
