// El CLI de Prisma (migrate, db push, studio) usa DIRECT_URL: una conexión
// directa a Postgres, necesaria porque las migraciones requieren bloqueos de
// sesión que el pooler de Supabase (pgbouncer, modo transacción) no soporta.
//
// La app en tiempo de ejecución NO usa este archivo: se conecta con su propio
// driver adapter (@prisma/adapter-pg) en src/lib/prisma.ts usando DATABASE_URL,
// que en producción debe ser la conexión *pooled* de Supabase (puerto 6543).
//
// En desarrollo local (Postgres embebido, sin pooler) ambas variables pueden
// apuntar al mismo servidor.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
