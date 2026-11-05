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

function monthRange(year: number, month: number): { gte: Date; lt: Date } {
  return { gte: new Date(Date.UTC(year, month - 1, 1)), lt: new Date(Date.UTC(year, month, 1)) };
}

export async function getEntrySummary(venueId: string, year: number, month: number): Promise<EntrySummary> {
  const date = monthRange(year, month);
  const [ing, egr, count] = await Promise.all([
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { venueId, type: "INGRESO", date } }),
    prisma.financialEntry.aggregate({ _sum: { amount: true }, where: { venueId, type: "EGRESO", date } }),
    prisma.financialEntry.count({ where: { venueId, date } }),
  ]);
  const ingresos = num(ing._sum.amount);
  const egresos = num(egr._sum.amount);
  return { ingresos, egresos, neto: ingresos - egresos, count };
}

export interface EntryFilters {
  year: number;
  month: number;
  type?: EntryType;
  category?: string;
  search?: string;
  createdById?: string;
  take?: number;
}

/** Minúsculas y sin acentos, para que "nomina" encuentre "Nómina". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/**
 * Ids de los movimientos del mes cuyo concepto, descripción, proveedor, folio,
 * referencia o notas contienen el texto buscado, sin distinguir mayúsculas ni
 * acentos (un ILIKE normal sí los distingue y se perdían, p. ej., las "Nómina").
 */
async function searchEntryIds(venueId: string, range: { gte: Date; lt: Date }, search: string): Promise<string[]> {
  const term = fold(search.trim());
  if (!term) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "FinancialEntry"
    WHERE "venueId" = ${venueId}
      AND date >= ${range.gte} AND date < ${range.lt}
      AND position(
        ${term} in translate(
          lower(concat_ws(' ', category, description, supplier, folio, reference, notes)),
          'áéíóúüñ', 'aeiouun'
        )
      ) > 0`;
  return rows.map((r) => r.id);
}

export async function getVenueEntries(venueId: string, filters: EntryFilters) {
  const range = monthRange(filters.year, filters.month);
  const searchIds = filters.search ? await searchEntryIds(venueId, range, filters.search) : null;
  const where: Prisma.FinancialEntryWhereInput = {
    venueId,
    date: range,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.createdById ? { createdById: filters.createdById } : {}),
    ...(searchIds ? { id: { in: searchIds } } : {}),
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
