import { readFileSync } from "node:fs";
import { parseStatement } from "@/lib/import";
import type { TxCategory } from "@/generated/prisma/enums";

const DATA_DIR = "C:/Users/geagu/OneDrive/Documentos/WERO/Clientes/G612 ADMIN";

const files = [
  { name: "(CONTADORA) 06.2026 Uno Edo de cuenta.csv", bank: "Santander / Uno" },
  { name: "(CONTADORA) 06.2026 Biznaga Edo de cuenta.xlsx", bank: "BanBajío / Biznaga" },
];

async function main() {
  for (const f of files) {
    console.log("\n=============================================");
    console.log(`Archivo: ${f.name}  (${f.bank})`);
    const buf = readFileSync(`${DATA_DIR}/${f.name}`);
    const parsed = await parseStatement(f.name, Buffer.from(buf));

    const byCat = new Map<TxCategory, { count: number; total: number }>();
    for (const r of parsed.rows) {
      const e = byCat.get(r.category) ?? { count: 0, total: 0 };
      e.count++;
      e.total += r.amount;
      byCat.set(r.category, e);
    }

    console.log(`  Banco detectado : ${parsed.bank}`);
    console.log(`  Movimientos     : ${parsed.rows.length}`);
    console.log(
      `  Periodo         : ${parsed.periodStart?.toISOString().slice(0, 10)} → ${parsed.periodEnd?.toISOString().slice(0, 10)}`,
    );
    console.log(`  Total cargos    : ${parsed.totalCargos.toLocaleString("es-MX")}`);
    console.log(`  Total abonos    : ${parsed.totalAbonos.toLocaleString("es-MX")}`);
    console.log("  Clasificación:");
    for (const [cat, e] of [...byCat.entries()].sort((a, b) => b[1].total - a[1].total)) {
      console.log(
        `    ${cat.padEnd(14)} ${String(e.count).padStart(4)}  $${e.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      );
    }
    console.log("  Primeras 5 filas:");
    for (const r of parsed.rows.slice(0, 5)) {
      console.log(
        `    ${r.date.toISOString().slice(0, 10)} ${r.direction.padEnd(5)} ${String(r.amount).padStart(10)} [${r.category}] ${r.description.slice(0, 40)}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
