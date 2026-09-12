-- CreateEnum
CREATE TYPE "FacturaEstado" AS ENUM ('PENDIENTE', 'FACTURADO', 'PAGADO');

-- AlterTable
ALTER TABLE "FolioPedidoCafeteria" ADD COLUMN     "entryId" TEXT,
ADD COLUMN     "status" "FacturaEstado" NOT NULL DEFAULT 'PENDIENTE',
ALTER COLUMN "folio" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "FolioPedidoCafeteria_entryId_key" ON "FolioPedidoCafeteria"("entryId");

-- AddForeignKey
ALTER TABLE "FolioPedidoCafeteria" ADD CONSTRAINT "FolioPedidoCafeteria_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
