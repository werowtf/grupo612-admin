"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { assertVenueAccess } from "@/lib/context";
import { logAudit } from "@/lib/audit";
import { parseStatement, computeDedupeHash, classifyWithMatch, normalizeConcept, ImportError } from "@/lib/import";
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
  /** Movimientos cuyo concepto no casó con ninguna regla de clasificación. */
  unmatched?: number;
  /** Conceptos distintos sin regla, para revisarlos en Movimientos. */
  unmatchedSamples?: string[];
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

  // Conceptos que alguien ya corrigió a mano en una importación anterior
  // (ver updateTransactionCategory): se aplican antes que las reglas fijas de
  // classify.ts, porque son más específicos y ya fueron confirmados por un
  // humano para este texto exacto.
  const learnedRules = await prisma.conceptRule.findMany();
  const learnedByConcept = new Map(learnedRules.map((r) => [r.concept, r.category]));

  const data = parsed.rows.map((r) => {
    const concept = normalizeConcept(r.description);
    const learned = learnedByConcept.get(concept);
    const { category: staticCategory, matched: staticMatched } = classifyWithMatch(r.description, r.direction);
    const category = learned ?? staticCategory;
    // Sin regla (fija o aprendida) que lo reconozca, la categoría es una
    // suposición (el criterio por defecto) — entra como Pendiente en vez de
    // Conciliado, para que quien revise Movimientos lo note y corrija en vez
    // de que se pierda entre lo que sí se conoce con certeza.
    const matched = learned !== undefined || staticMatched;
    return {
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
      category,
      status: matched ? undefined : ("PENDIENTE" as const),
      counterpartyName: r.counterpartyName,
      counterpartyRfc: r.counterpartyRfc,
      trackingKey: r.trackingKey,
      dedupeHash: computeDedupeHash(r),
      raw: r.raw as Prisma.InputJsonValue,
    };
  });

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

  // Los bancos cambian la redacción de un mes a otro. Cuando un concepto no
  // casa con ninguna regla (fija o aprendida) se usa el criterio por defecto,
  // que puede quedar en la categoría equivocada sin que nadie lo note; lo
  // reportamos para revisión.
  const unmatchedDescs = new Set<string>();
  for (const r of parsed.rows) {
    const isLearned = learnedByConcept.has(normalizeConcept(r.description));
    if (!isLearned && !classifyWithMatch(r.description, r.direction).matched) {
      unmatchedDescs.add(r.description.split("|")[0].trim());
    }
  }

  await logAudit({
    userId: user.id,
    action: "statement.import",
    entity: "BankStatement",
    entityId: statement.id,
    meta: { fileName: file.name, imported: count, duplicates, unmatched: unmatchedDescs.size },
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
    unmatched: unmatchedDescs.size,
    unmatchedSamples: [...unmatchedDescs].slice(0, 8),
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
    orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
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

  // Corrección manual explícita: se aprende para la próxima importación. Un
  // simple cambio de estatus (p.ej. marcar Conciliado) no dispara esto —
  // sólo cuando el humano dice, en el selector, cuál es la categoría
  // correcta, para no reforzar la adivinanza por defecto que lo dejó pendiente.
  const concept = normalizeConcept(tx.description);
  await prisma.conceptRule.upsert({
    where: { concept },
    create: { concept, category: parsed, createdById: user.id },
    update: { category: parsed, createdById: user.id },
  });

  await logAudit({
    userId: user.id,
    action: "tx.recategorize",
    entity: "BankTransaction",
    entityId: tx.id,
    meta: { from: tx.category, to: parsed, concept },
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
