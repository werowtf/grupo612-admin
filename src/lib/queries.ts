import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  TxCategory,
  TxDirection,
  TxStatus,
} from "@/generated/prisma/enums";

function num(v: Prisma.Decimal | null | undefined): number {
  return v ? Number(v.toString()) : 0;
}

export interface VenueSummary {
  totalAbonos: number;
  totalCargos: number;
  neto: number;
  count: number;
  pendientes: number;
  byCategory: { category: TxCategory; total: number; count: number }[];
}

export async function getVenueSummary(venueId: string): Promise<VenueSummary> {
  const where: Prisma.BankTransactionWhereInput = {
    bankAccount: { venueId },
  };

  const [abonos, cargos, count, pendientes, grouped] = await Promise.all([
    prisma.bankTransaction.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "ABONO" },
    }),
    prisma.bankTransaction.aggregate({
      _sum: { amount: true },
      where: { ...where, direction: "CARGO" },
    }),
    prisma.bankTransaction.count({ where }),
    prisma.bankTransaction.count({ where: { ...where, status: "PENDIENTE" } }),
    prisma.bankTransaction.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalAbonos = num(abonos._sum.amount);
  const totalCargos = num(cargos._sum.amount);

  return {
    totalAbonos,
    totalCargos,
    neto: totalAbonos - totalCargos,
    count,
    pendientes,
    byCategory: grouped
      .map((g) => ({
        category: g.category,
        total: num(g._sum.amount),
        count: g._count,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

export async function getVenueStatements(venueId: string) {
  return prisma.bankStatement.findMany({
    where: { bankAccount: { venueId } },
    include: { bankAccount: true, importedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export interface TxFilters {
  category?: TxCategory;
  direction?: TxDirection;
  status?: TxStatus;
  search?: string;
  take?: number;
}

export async function getVenueTransactions(venueId: string, filters: TxFilters = {}) {
  const where: Prisma.BankTransactionWhereInput = {
    bankAccount: { venueId },
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.direction ? { direction: filters.direction } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { description: { contains: filters.search, mode: "insensitive" } },
            { reference: { contains: filters.search, mode: "insensitive" } },
            { concept: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: filters.take ?? 200,
    }),
    prisma.bankTransaction.count({ where }),
  ]);

  return { rows, total };
}
