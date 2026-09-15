-- AlterTable
ALTER TABLE "Corte" ADD COLUMN     "propinasPagadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "propinasPagadasAt" TIMESTAMP(3);
