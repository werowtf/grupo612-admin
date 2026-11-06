-- AlterTable
ALTER TABLE "OficinaCajaChicaGasto" ADD COLUMN "venueId" TEXT,
ADD COLUMN "entryId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "OficinaCajaChicaGasto_entryId_key" ON "OficinaCajaChicaGasto"("entryId");

-- CreateIndex
CREATE INDEX "OficinaCajaChicaGasto_venueId_idx" ON "OficinaCajaChicaGasto"("venueId");

-- AddForeignKey
ALTER TABLE "OficinaCajaChicaGasto" ADD CONSTRAINT "OficinaCajaChicaGasto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OficinaCajaChicaGasto" ADD CONSTRAINT "OficinaCajaChicaGasto_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
