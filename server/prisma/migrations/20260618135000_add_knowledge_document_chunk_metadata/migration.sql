-- AlterTable
ALTER TABLE "KnowledgeDocument"
ADD COLUMN "sourceType" TEXT NOT NULL DEFAULT 'seed',
ADD COLUMN "sourceName" TEXT NOT NULL DEFAULT 'seed',
ADD COLUMN "chunkIndex" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "KnowledgeDocument_sourceName_idx" ON "KnowledgeDocument"("sourceName");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_sourceName_chunkIndex_idx" ON "KnowledgeDocument"("sourceName", "chunkIndex");
