"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { parseStatement, computeDedupeHash, ImportError } from "@/lib/import";
import { bankLabels } from "@/lib/labels";
import { toTxRow } from "@/lib/serialize";
import type { TxRow } from "@/components/transactions-table";

export interface ImportResult {
  ok?: boolean;
  error?: string;
  imported?: number;
  duplicates?: number;
  total?: number;
  totalAbonos?: number;
  totalCargos?: number;
}

export async function importStatementAction(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sesión expirada. Vuelve a iniciar sesión." };

  const bankAccountId = String(formData.get("bankAccountId") ?? "");
  const file = formData.get("file");

  if (!bankAccountId) return { error: "Selecciona una cuenta bancaria." };
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo de estado de cuenta." };
  }

  const account = await prisma.bankAccount.findUnique({
    where: { id: bankAccountId },
  });
  if (!account) return { error: "Cuenta bancaria no encontrada." };

  try {
    await assertVenueAccess(user, account.venueId);
  } catch {
    return { error: "No tienes acceso a este negocio." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let parsed;
  try {
    parsed = await parseStatement(file.name, buffer);
  } catch (err) {
    if (err instanceof ImportError) return { error: err.message };
    console.error("Error al procesar el estado de cuenta:", err);
    return { error: "No se pudo leer el archivo. Verifica que no esté dañado." };
  }

  if (parsed.bank !== account.bank) {
    return {
      error: `El archivo parece ser de ${bankLabels[parsed.bank]}, pero la cuenta seleccionada es de ${bankLabels[account.bank]}.`,
    };
  }
  if (parsed.rows.length === 0) {
    return { error: "No se encontraron movimientos en el archivo." };
  }

  // Crear el lote (estado de cuenta) y luego insertar movimientos evitando duplicados.
  const statement = await prisma.bankStatement.create({
    data: {
      bankAccountId: account.id,
      bank: parsed.bank,
      fileName: file.name,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rowCount: parsed.rows.length,
      totalCargos: parsed.totalCargos,
      totalAbonos: parsed.totalAbonos,
      importedById: user.id,
    },
  });

  const data = parsed.rows.map((r) => ({
    bankAccountId: account.id,
    statementId: statement.id,
    date: r.date,
    time: r.time,
    description: r.description,
    descriptionLong: r.descriptionLong,
    direction: r.direction,
    amount: r.amount,
    balance: r.balance,
    reference: r.reference,
    concept: r.concept,
    category: r.category,
    counterpartyName: r.counterpartyName,
    counterpartyRfc: r.counterpartyRfc,
    trackingKey: r.trackingKey,
    dedupeHash: computeDedupeHash(r),
    raw: r.raw as Prisma.InputJsonValue,
  }));

  const { count } = await prisma.bankTransaction.createMany({
    data,
    skipDuplicates: true,
  });
  const duplicates = parsed.rows.length - count;

  await prisma.bankStatement.update({
    where: { id: statement.id },
    data: { importedCount: count, duplicateCount: duplicates },
  });

  // Si todo era duplicado, no dejamos un lote vacío.
  if (count === 0) {
    await prisma.bankStatement.delete({ where: { id: statement.id } });
    return {
      ok: true,
      imported: 0,
      duplicates,
      total: parsed.rows.length,
      error:
        "Todos los movimientos ya estaban importados; no se agregó nada nuevo.",
    };
  }

  await logAudit({
    userId: user.id,
    action: "statement.import",
    entity: "BankStatement",
    entityId: statement.id,
    meta: { fileName: file.name, imported: count, duplicates },
  });

  revalidatePath("/conciliacion");
  revalidatePath("/movimientos");
  revalidatePath("/dashboard");
  revalidatePath("/portal");

  return {
    ok: true,
    imported: count,
    duplicates,
    total: parsed.rows.length,
    totalAbonos: parsed.totalAbonos,
    totalCargos: parsed.totalCargos,
  };
}

export async function getStatementTransactionsAction(statementId: string): Promise<TxRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const statement = await prisma.bankStatement.findUnique({
    where: { id: statementId },
    include: { bankAccount: true },
  });
  if (!statement) return [];
  await assertVenueAccess(user, statement.bankAccount.venueId);

  const rows = await prisma.bankTransaction.findMany({
    where: { statementId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toTxRow);
}

// ── Edición de movimientos ────────────────────────────────────

const categorySchema = z.enum([
  "TRANSFERENCIA",
  "CHEQUE",
  "DEPOSITO",
  "COMISION",
  "GASTO_TARJETA",
]);
const statusSchema = z.enum(["PENDIENTE", "CONCILIADO", "IGNORADO"]);

async function loadTxForUser(txId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  const tx = await prisma.bankTransaction.findUnique({
    where: { id: txId },
    include: { bankAccount: true },
  });
  if (!tx) throw new Error("Movimiento no encontrado");
  await assertVenueAccess(user, tx.bankAccount.venueId);
  return { user, tx };
}

export async function updateTransactionCategory(txId: string, category: string) {
  const parsed = categorySchema.parse(category);
  const { user, tx } = await loadTxForUser(txId);
  await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: { category: parsed, autoCategorized: false },
  });
  await logAudit({
    userId: user.id,
    action: "tx.recategorize",
    entity: "BankTransaction",
    entityId: tx.id,
    meta: { from: tx.category, to: parsed },
  });
  revalidatePath("/conciliacion");
  revalidatePath("/movimientos");
}

export async function updateTransactionStatus(txId: string, status: string) {
  const parsed = statusSchema.parse(status);
  const { user, tx } = await loadTxForUser(txId);
  await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: { status: parsed },
  });
  await logAudit({
    userId: user.id,
    action: "tx.setStatus",
    entity: "BankTransaction",
    entityId: tx.id,
    meta: { from: tx.status, to: parsed },
  });
  revalidatePath("/conciliacion");
  revalidatePath("/movimientos");
}
