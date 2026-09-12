-- CreateTable
CREATE TABLE "OficinaNota" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OficinaNota_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OficinaNota" ADD CONSTRAINT "OficinaNota_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
