-- CreateTable
CREATE TABLE "ConceptRule" (
    "id" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "category" "TxCategory" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConceptRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConceptRule_concept_key" ON "ConceptRule"("concept");

-- AddForeignKey
ALTER TABLE "ConceptRule" ADD CONSTRAINT "ConceptRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
