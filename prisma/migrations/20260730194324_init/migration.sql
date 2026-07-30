-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'GERENTE', 'CONTADOR', 'CONTADOR_EXTERNO', 'COMPRAS', 'CAJERO');

-- CreateEnum
CREATE TYPE "Bank" AS ENUM ('SANTANDER', 'BANBAJIO', 'OTRO');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('IMPORTED', 'REVIEWED');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('CARGO', 'ABONO');

-- CreateEnum
CREATE TYPE "TxCategory" AS ENUM ('TRANSFERENCIA', 'CHEQUE', 'DEPOSITO', 'COMISION', 'GASTO_TARJETA', 'OTRO');

-- CreateEnum
CREATE TYPE "TxStatus" AS ENUM ('PENDIENTE', 'CONCILIADO', 'IGNORADO');

-- CreateEnum
CREATE TYPE "CorteSource" AS ENUM ('MANUAL', 'EXCEL', 'OCR');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('MANUAL', 'OCR');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('FACTURA', 'CONTRATO', 'COMPROBANTE', 'IDENTIFICACION', 'ACTA_CONSTITUTIVA', 'PERMISO', 'RECIBO', 'OTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONTADOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "rfc" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserVenue" (
    "userId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,

    CONSTRAINT "UserVenue_pkey" PRIMARY KEY ("userId","venueId")
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "bank" "Bank" NOT NULL,
    "alias" TEXT NOT NULL,
    "accountNumber" TEXT,
    "clabe" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankStatement" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "bank" "Bank" NOT NULL,
    "fileName" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "totalCargos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAbonos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "StatementStatus" NOT NULL DEFAULT 'IMPORTED',
    "importedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "description" TEXT NOT NULL,
    "descriptionLong" TEXT,
    "direction" "TxDirection" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balance" DECIMAL(14,2),
    "reference" TEXT,
    "concept" TEXT,
    "category" "TxCategory" NOT NULL DEFAULT 'OTRO',
    "autoCategorized" BOOLEAN NOT NULL DEFAULT true,
    "counterpartyName" TEXT,
    "counterpartyRfc" TEXT,
    "trackingKey" TEXT,
    "status" "TxStatus" NOT NULL DEFAULT 'PENDIENTE',
    "note" TEXT,
    "dedupeHash" TEXT NOT NULL,
    "raw" JSONB,
    "corteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corte" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "turno" TEXT,
    "cajera" TEXT,
    "estacion" TEXT,
    "folioCorteZ" TEXT,
    "folioInicial" TEXT,
    "folioFinal" TEXT,
    "pagoEfectivo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagoVisa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagoMastercard" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagoAmex" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagoVales" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pagoOtros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalFormasPago" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "propinaEfectivo" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "propinaVisa" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "propinaMastercard" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "propinaAmex" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPropinas" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ventaAlimentos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ventaBebidas" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ventaOtros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "descuentos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "ventaNeta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "iva" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalVenta" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "efectivoInicial" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "efectivoDeclarado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "retiros" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "depositos" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sobranteFaltante" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cuentasNormales" INTEGER,
    "cuentasCanceladas" INTEGER,
    "comensales" INTEGER,
    "cuentaPromedio" DECIMAL(14,2),
    "source" "CorteSource" NOT NULL DEFAULT 'MANUAL',
    "fileName" TEXT,
    "rawText" TEXT,
    "raw" JSONB,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Corte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialEntry" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "supplier" TEXT,
    "rfc" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'EFECTIVO',
    "reference" TEXT,
    "folio" TEXT,
    "source" "EntrySource" NOT NULL DEFAULT 'MANUAL',
    "photo" BYTEA,
    "photoMime" TEXT,
    "rawText" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTRO',
    "tags" TEXT,
    "notes" TEXT,
    "fileName" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "file" BYTEA NOT NULL,
    "corteId" TEXT,
    "entryId" TEXT,
    "bankTransactionId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_venueId_bank_accountNumber_key" ON "BankAccount"("venueId", "bank", "accountNumber");

-- CreateIndex
CREATE INDEX "BankTransaction_bankAccountId_date_idx" ON "BankTransaction"("bankAccountId", "date");

-- CreateIndex
CREATE INDEX "BankTransaction_statementId_idx" ON "BankTransaction"("statementId");

-- CreateIndex
CREATE INDEX "BankTransaction_category_idx" ON "BankTransaction"("category");

-- CreateIndex
CREATE INDEX "BankTransaction_corteId_idx" ON "BankTransaction"("corteId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_bankAccountId_dedupeHash_key" ON "BankTransaction"("bankAccountId", "dedupeHash");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "Corte_venueId_date_idx" ON "Corte"("venueId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Corte_venueId_folioCorteZ_key" ON "Corte"("venueId", "folioCorteZ");

-- CreateIndex
CREATE INDEX "FinancialEntry_venueId_date_idx" ON "FinancialEntry"("venueId", "date");

-- CreateIndex
CREATE INDEX "FinancialEntry_type_idx" ON "FinancialEntry"("type");

-- CreateIndex
CREATE INDEX "FinancialEntry_category_idx" ON "FinancialEntry"("category");

-- CreateIndex
CREATE INDEX "FinancialEntry_createdById_idx" ON "FinancialEntry"("createdById");

-- CreateIndex
CREATE INDEX "Document_venueId_createdAt_idx" ON "Document"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "Document"("category");

-- CreateIndex
CREATE INDEX "Document_corteId_idx" ON "Document"("corteId");

-- CreateIndex
CREATE INDEX "Document_entryId_idx" ON "Document"("entryId");

-- CreateIndex
CREATE INDEX "Document_bankTransactionId_idx" ON "Document"("bankTransactionId");

-- AddForeignKey
ALTER TABLE "UserVenue" ADD CONSTRAINT "UserVenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVenue" ADD CONSTRAINT "UserVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankStatement" ADD CONSTRAINT "BankStatement_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "BankStatement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Corte" ADD CONSTRAINT "Corte_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Corte" ADD CONSTRAINT "Corte_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialEntry" ADD CONSTRAINT "FinancialEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_corteId_fkey" FOREIGN KEY ("corteId") REFERENCES "Corte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "FinancialEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_bankTransactionId_fkey" FOREIGN KEY ("bankTransactionId") REFERENCES "BankTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

