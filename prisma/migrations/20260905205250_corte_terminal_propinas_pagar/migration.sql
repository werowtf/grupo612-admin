-- AlterTable
ALTER TABLE "Corte" ADD COLUMN     "propinasPorPagar" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ventaTerminalBanbajio" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ventaTerminalPayefy" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "ventaTerminalWuzi" DECIMAL(14,2) NOT NULL DEFAULT 0;
