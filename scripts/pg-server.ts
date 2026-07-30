/**
 * Servidor PostgreSQL local embebido para desarrollo (sin Docker).
 * Puerto fijo 54329, datos persistentes en ./.pgdata.
 * Mantén este proceso corriendo mientras desarrollas. Ctrl+C para detener.
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve(process.cwd(), ".pgdata");
const PORT = 54329;

const pg = new EmbeddedPostgres({
  databaseDir: DIR,
  user: "postgres",
  password: "postgres",
  port: PORT,
  persistent: true,
  authMethod: "password",
});

async function main() {
  if (!existsSync(path.join(DIR, "PG_VERSION"))) {
    console.log("Inicializando cluster PostgreSQL en", DIR);
    await pg.initialise();
  }
  await pg.start();
  console.log(`✓ PostgreSQL embebido escuchando en localhost:${PORT}`);
  console.log("  Deja este proceso abierto mientras desarrollas.");

  const shutdown = async () => {
    console.log("\nDeteniendo PostgreSQL…");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Mantener el proceso (y por tanto Postgres) vivo.
  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error("No se pudo iniciar PostgreSQL embebido:", e);
  process.exit(1);
});
