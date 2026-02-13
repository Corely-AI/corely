-- Add richer thread metadata to copilot runs
ALTER TABLE "platform"."AgentRun"
ADD COLUMN "title" TEXT,
ADD COLUMN "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill message timestamps into runs where messages already exist
UPDATE "platform"."AgentRun" AS run
SET
  "lastMessageAt" = COALESCE(msg."maxCreatedAt", run."startedAt"),
  "updatedAt" = COALESCE(msg."maxCreatedAt", run."createdAt")
FROM (
  SELECT "runId", MAX("createdAt") AS "maxCreatedAt"
  FROM "platform"."Message"
  GROUP BY "runId"
) AS msg
WHERE run."id" = msg."runId";

-- Store extracted text for faster chat search/snippets
ALTER TABLE "platform"."Message"
ADD COLUMN "contentText" TEXT;

CREATE INDEX "AgentRun_tenantId_createdByUserId_lastMessageAt_idx"
ON "platform"."AgentRun"("tenantId", "createdByUserId", "lastMessageAt" DESC);

CREATE INDEX "AgentRun_tenantId_createdByUserId_createdAt_idx"
ON "platform"."AgentRun"("tenantId", "createdByUserId", "createdAt" DESC);

CREATE INDEX "Message_tenantId_createdAt_idx"
ON "platform"."Message"("tenantId", "createdAt" DESC);
