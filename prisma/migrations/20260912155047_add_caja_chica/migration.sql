-- CreateTable
CREATE TABLE "CajaChicaFondo" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "entryId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaChicaFondo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CajaChicaGasto" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CajaChicaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CajaChicaFondo_entryId_key" ON "CajaChicaFondo"("entryId");

-- CreateIndex
CREATE INDEX "CajaChicaFondo_venueId_date_idx" ON "CajaChicaFondo"("venueId", "date");

-- CreateIndex
CREATE INDEX "CajaChicaGasto_venueId_date_idx" ON "CajaChicaGasto"("venueId", "date");

-- AddForeignKey
ALTER TABLE "CajaChicaFondo" ADD CONSTRAINT "CajaChicaFondo_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaChicaFondo" ADD CONSTRAINT "CajaChicaFondo_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaChicaFondo" ADD CONSTRAINT "CajaChicaFondo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaChicaGasto" ADD CONSTRAINT "CajaChicaGasto_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CajaChicaGasto" ADD CONSTRAINT "CajaChicaGasto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
