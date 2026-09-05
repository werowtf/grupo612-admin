-- CreateTable
CREATE TABLE "FolioPedidoCafeteria" (
    "id" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "folio" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FolioPedidoCafeteria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FolioPedidoCafeteria_venueId_date_key" ON "FolioPedidoCafeteria"("venueId", "date");

-- AddForeignKey
ALTER TABLE "FolioPedidoCafeteria" ADD CONSTRAINT "FolioPedidoCafeteria_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
