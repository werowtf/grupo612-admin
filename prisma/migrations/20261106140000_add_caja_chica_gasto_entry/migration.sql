-- AlterTable
ALTER TABLE "CajaChicaGasto" ADD COLUMN "entryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CajaChicaGasto_entryId_key" ON "CajaChicaGasto"("entryId");

-- AddForeignKey
ALTER TABLE "CajaChicaGasto" ADD CONSTRAINT "CajaChicaGasto_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
