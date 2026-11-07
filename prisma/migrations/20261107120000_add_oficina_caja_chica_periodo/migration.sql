-- CreateTable
CREATE TABLE "OficinaCajaChicaPeriodo" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "fondoFijo" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OficinaCajaChicaPeriodo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OficinaCajaChicaPeriodo_startDate_key" ON "OficinaCajaChicaPeriodo"("startDate");
