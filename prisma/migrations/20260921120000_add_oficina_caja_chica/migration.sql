-- CreateTable
CREATE TABLE "OficinaCajaChicaFondo" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OficinaCajaChicaFondo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OficinaCajaChicaGasto" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OficinaCajaChicaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OficinaCajaChicaFondo_date_idx" ON "OficinaCajaChicaFondo"("date");

-- CreateIndex
CREATE INDEX "OficinaCajaChicaGasto_date_idx" ON "OficinaCajaChicaGasto"("date");

-- AddForeignKey
ALTER TABLE "OficinaCajaChicaFondo" ADD CONSTRAINT "OficinaCajaChicaFondo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OficinaCajaChicaGasto" ADD CONSTRAINT "OficinaCajaChicaGasto_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

