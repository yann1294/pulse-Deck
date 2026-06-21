-- Preserve the existing suggestedReply column for backward compatibility.
-- originalSuggestedReply is backfilled from suggestedReply so existing demo and local data
-- retain the immutable AI draft without changing current API consumers.
ALTER TABLE "TicketAiSuggestion"
ADD COLUMN "originalSuggestedReply" TEXT,
ADD COLUMN "finalApprovedReply" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedByUserId" TEXT,
ADD COLUMN "editedBeforeApproval" BOOLEAN NOT NULL DEFAULT false;

UPDATE "TicketAiSuggestion"
SET "originalSuggestedReply" = "suggestedReply"
WHERE "suggestedReply" IS NOT NULL
  AND "originalSuggestedReply" IS NULL;
