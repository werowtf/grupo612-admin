import "server-only";
import { prisma } from "@/lib/prisma";

export async function getOficinaNotas() {
  return prisma.oficinaNota.findMany({
    orderBy: { updatedAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });
}
