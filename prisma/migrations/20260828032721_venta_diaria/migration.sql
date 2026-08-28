-- CreateTable
CREATE TABLE "DailySale" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "efectivo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tarjeta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credito" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "statusCredito" TEXT,
    "comida" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bebida" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailySale_venueId_date_idx" ON "DailySale"("venueId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailySale_venueId_date_key" ON "DailySale"("venueId", "date");

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySale" ADD CONSTRAINT "DailySale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
