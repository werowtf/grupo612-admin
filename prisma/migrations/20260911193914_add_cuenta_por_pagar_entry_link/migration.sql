-- AlterTable
ALTER TABLE "CuentaPorPagar" ADD COLUMN     "entryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CuentaPorPagar_entryId_key" ON "CuentaPorPagar"("entryId");

-- AddForeignKey
ALTER TABLE "CuentaPorPagar" ADD CONSTRAINT "CuentaPorPagar_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
