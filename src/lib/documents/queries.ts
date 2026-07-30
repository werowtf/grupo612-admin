import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { DocumentCategory } from "@/generated/prisma/enums";

export interface DocumentFilters {
  category?: DocumentCategory;
  search?: string;
  take?: number;
}

export async function getVenueDocuments(venueId: string, filters: DocumentFilters = {}) {
  const where: Prisma.DocumentWhereInput = {
    venueId,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { tags: { contains: filters.search, mode: "insensitive" } },
            { fileName: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.take ?? 200,
      select: {
        id: true,
        title: true,
        category: true,
        tags: true,
        fileName: true,
        mime: true,
        size: true,
        createdAt: true,
        corteId: true,
        entryId: true,
        bankTransactionId: true,
      },
    }),
    prisma.document.count({ where }),
  ]);
  return { rows, total };
}

/** Documentos vinculados a un corte, movimiento o transacción bancaria específicos. */
export function getLinkedDocuments(opts: {
  corteId?: string;
  entryId?: string;
  bankTransactionId?: string;
}) {
  return prisma.document.findMany({
    where: {
      OR: [
        opts.corteId ? { corteId: opts.corteId } : undefined,
        opts.entryId ? { entryId: opts.entryId } : undefined,
        opts.bankTransactionId ? { bankTransactionId: opts.bankTransactionId } : undefined,
      ].filter(Boolean) as Prisma.DocumentWhereInput[],
    },
    orderBy: { createdAt: "desc" },
  });
}
