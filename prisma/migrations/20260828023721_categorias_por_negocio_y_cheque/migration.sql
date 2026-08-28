-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CHEQUE';

-- CreateTable
CREATE TABLE "EntryCategory" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "type" "EntryType" NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntryCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntryCategory_venueId_type_active_idx" ON "EntryCategory"("venueId", "type", "active");

-- CreateIndex
CREATE UNIQUE INDEX "EntryCategory_venueId_type_name_key" ON "EntryCategory"("venueId", "type", "name");

-- AddForeignKey
ALTER TABLE "EntryCategory" ADD CONSTRAINT "EntryCategory_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
