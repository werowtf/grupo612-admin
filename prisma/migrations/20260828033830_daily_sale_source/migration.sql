-- CreateEnum
CREATE TYPE "DailySaleSource" AS ENUM ('MANUAL', 'CORTE');

-- AlterTable
ALTER TABLE "DailySale" ADD COLUMN     "source" "DailySaleSource" NOT NULL DEFAULT 'MANUAL';
