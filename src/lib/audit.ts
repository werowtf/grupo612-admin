import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface AuditInput {
  userId?: string | null;
  action: string;
  entity?: string;
  entityId?: string;
  meta?: Prisma.InputJsonValue;
}

/** Registra una acción en la bitácora de auditoría (no lanza en caso de error). */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        meta: input.meta,
      },
    });
  } catch (err) {
    console.error("No se pudo registrar auditoría:", err);
  }
}
