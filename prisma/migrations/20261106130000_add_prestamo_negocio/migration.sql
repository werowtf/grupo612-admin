-- CreateEnum
CREATE TYPE "PrestamoEstado" AS ENUM ('VIGENTE', 'REEMBOLSADO');

-- CreateTable
CREATE TABLE "PrestamoNegocio" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'EFECTIVO',
    "lenderVenueId" TEXT NOT NULL,
    "borrowerVenueId" TEXT NOT NULL,
    "status" "PrestamoEstado" NOT NULL DEFAULT 'VIGENTE',
    "lenderEntryId" TEXT,
    "borrowerEntryId" TEXT,
    "reimbursedAt" TIMESTAMP(3),
    "reimbursePaymentMethod" "PaymentMethod",
    "borrowerRepayEntryId" TEXT,
    "lenderRepayEntryId" TEXT,
    "reimbursedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrestamoNegocio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrestamoNegocio_date_idx" ON "PrestamoNegocio"("date");

-- CreateIndex
CREATE INDEX "PrestamoNegocio_lenderVenueId_idx" ON "PrestamoNegocio"("lenderVenueId");

-- CreateIndex
CREATE INDEX "PrestamoNegocio_borrowerVenueId_idx" ON "PrestamoNegocio"("borrowerVenueId");

-- AddForeignKey
ALTER TABLE "PrestamoNegocio" ADD CONSTRAINT "PrestamoNegocio_lenderVenueId_fkey" FOREIGN KEY ("lenderVenueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrestamoNegocio" ADD CONSTRAINT "PrestamoNegocio_borrowerVenueId_fkey" FOREIGN KEY ("borrowerVenueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
