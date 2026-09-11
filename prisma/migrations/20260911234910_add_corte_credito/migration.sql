-- CreateTable
CREATE TABLE "CorteCredito" (
    "id" TEXT NOT NULL,
    "corteId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CorteCredito_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorteCredito_corteId_idx" ON "CorteCredito"("corteId");

-- AddForeignKey
ALTER TABLE "CorteCredito" ADD CONSTRAINT "CorteCredito_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
