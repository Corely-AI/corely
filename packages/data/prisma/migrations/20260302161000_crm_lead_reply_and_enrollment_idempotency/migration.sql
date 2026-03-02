ALTER TABLE "crm"."Lead"
ADD COLUMN "lastRepliedAt" TIMESTAMPTZ(6);

CREATE INDEX "Lead_tenantId_lastRepliedAt_idx"
ON "crm"."Lead"("tenantId", "lastRepliedAt");

ALTER TABLE "crm"."Activity"
ADD COLUMN "leadId" TEXT;

CREATE INDEX "Activity_tenantId_leadId_createdAt_idx"
ON "crm"."Activity"("tenantId", "leadId", "createdAt");

ALTER TABLE "crm"."Activity"
ADD CONSTRAINT "Activity_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "crm"."Lead"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "crm_seq_enrollment_lead_deal_unique"
ON "crm"."SequenceEnrollment"("tenantId", "sequenceId", "leadId", "dealId");
