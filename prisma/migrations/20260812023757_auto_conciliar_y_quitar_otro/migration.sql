-- El estado de cuenta importado ES la tarjeta del negocio: todo cargo/abono
-- pertenece a la conciliación, así que ya no se necesita una categoría
-- "Otro" ni un estado "Pendiente" por defecto al importar.

-- 1) Remapear filas existentes en 'OTRO' antes de quitar el valor del enum
--    (Postgres no permite eliminar un valor de enum todavía referenciado).
UPDATE "BankTransaction" SET "category" = 'GASTO_TARJETA' WHERE "category" = 'OTRO';

-- 2) Recrear TxCategory sin 'OTRO'.
ALTER TYPE "TxCategory" RENAME TO "TxCategory_old";
CREATE TYPE "TxCategory" AS ENUM ('TRANSFERENCIA', 'CHEQUE', 'DEPOSITO', 'COMISION', 'GASTO_TARJETA');
ALTER TABLE "BankTransaction" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "BankTransaction" ALTER COLUMN "category" TYPE "TxCategory" USING ("category"::text::"TxCategory");
ALTER TABLE "BankTransaction" ALTER COLUMN "category" SET DEFAULT 'GASTO_TARJETA';
DROP TYPE "TxCategory_old";

-- 3) Conciliar retroactivamente todo lo ya importado (estaba en PENDIENTE por
--    no tener aún esta lógica) y cambiar el default para las próximas importaciones.
UPDATE "BankTransaction" SET "status" = 'CONCILIADO' WHERE "status" = 'PENDIENTE';
ALTER TABLE "BankTransaction" ALTER COLUMN "status" SET DEFAULT 'CONCILIADO';
