-- AlterEnum
ALTER TYPE "EntrySource" ADD VALUE 'SISTEMA';

-- CreateTable
CREATE TABLE "Cafeteria" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cafeteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoCafeteria" (
    "id" TEXT NOT NULL,
    "cafeteriaId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoCafeteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoCafeteria" (
    "id" TEXT NOT NULL,
    "cafeteriaId" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoCafeteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacturaCafeteria" (
    "id" TEXT NOT NULL,
    "cafeteriaId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "entryId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacturaCafeteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cafeteria_venueId_name_key" ON "Cafeteria"("venueId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoCafeteria_cafeteriaId_name_key" ON "ProductoCafeteria"("cafeteriaId", "name");

-- CreateIndex
CREATE INDEX "PedidoCafeteria_cafeteriaId_date_idx" ON "PedidoCafeteria"("cafeteriaId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoCafeteria_cafeteriaId_productoId_date_key" ON "PedidoCafeteria"("cafeteriaId", "productoId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaCafeteria_entryId_key" ON "FacturaCafeteria"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "FacturaCafeteria_cafeteriaId_year_month_key" ON "FacturaCafeteria"("cafeteriaId", "year", "month");

-- AddForeignKey
ALTER TABLE "Cafeteria" ADD CONSTRAINT "Cafeteria_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoCafeteria" ADD CONSTRAINT "ProductoCafeteria_cafeteriaId_fkey" FOREIGN KEY ("cafeteriaId") REFERENCES "Cafeteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCafeteria" ADD CONSTRAINT "PedidoCafeteria_cafeteriaId_fkey" FOREIGN KEY ("cafeteriaId") REFERENCES "Cafeteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoCafeteria" ADD CONSTRAINT "PedidoCafeteria_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "ProductoCafeteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaCafeteria" ADD CONSTRAINT "FacturaCafeteria_cafeteriaId_fkey" FOREIGN KEY ("cafeteriaId") REFERENCES "Cafeteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaCafeteria" ADD CONSTRAINT "FacturaCafeteria_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacturaCafeteria" ADD CONSTRAINT "FacturaCafeteria_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
