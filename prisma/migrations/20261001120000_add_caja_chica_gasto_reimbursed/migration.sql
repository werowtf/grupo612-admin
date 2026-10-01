-- AlterTable
ALTER TABLE "CajaChicaGasto" ADD COLUMN     "reimbursed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reimbursedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OficinaCajaChicaGasto" ADD COLUMN     "reimbursed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reimbursedAt" TIMESTAMP(3);

