ALTER TABLE "crm"."CoachingOffer"
  ADD COLUMN "meetingType" VARCHAR(32) NOT NULL DEFAULT 'video',
  ADD COLUMN "availabilityRuleJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "bookingRulesJson" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "contractTemplateJson" JSONB,
  ADD COLUMN "archivedAt" TIMESTAMPTZ(6);

DROP INDEX IF EXISTS "crm"."CoachingOffer_tenantId_workspaceId_createdAt_idx";

CREATE INDEX "CoachingOffer_tenantId_workspaceId_archivedAt_createdAt_idx"
  ON "crm"."CoachingOffer"("tenantId", "workspaceId", "archivedAt", "createdAt");
