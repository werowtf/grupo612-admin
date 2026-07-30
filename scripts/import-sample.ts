import "dotenv/config";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { parseStatement, computeDedupeHash } from "@/lib/import";
import type { Prisma } from "@/generated/prisma/client";

const DATA_DIR = "C:/Users/geagu/OneDrive/Documentos/WERO/Clientes/G612 ADMIN";

const files = [
  { name: "(CONTADORA) 06.2026 Uno Edo de cuenta.csv", bank: "SANTANDER" as const },
  { name: "(CONTADORA) 06.2026 Biznaga Edo de cuenta.xlsx", bank: "BANBAJIO" as const },
];

async function main() {
  for (const f of files) {
    const account = await prisma.bankAccount.findFirst({ where: { bank: f.bank } });
    if (!account) {
      console.log(`⚠ Sin cuenta ${f.bank}, omito ${f.name}`);
      continue;
    }

    const buffer = readFileSync(`${DATA_DIR}/${f.name}`);
    const parsed = await parseStatement(f.name, Buffer.from(buffer));

    const statement = await prisma.bankStatement.create({
      data: {
        bankAccountId: account.id,
        bank: parsed.bank,
        fileName: f.name,
        periodStart: parsed.periodStart,
        periodEnd: parsed.periodEnd,
        rowCount: parsed.rows.length,
        totalCargos: parsed.totalCargos,
        totalAbonos: parsed.totalAbonos,
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

    console.log(
      `✓ ${account.alias}: ${count} importados, ${duplicates} duplicados (de ${parsed.rows.length})`,
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
