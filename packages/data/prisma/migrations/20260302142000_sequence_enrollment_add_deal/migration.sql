ALTER TABLE "crm"."SequenceEnrollment"
ADD COLUMN "dealId" TEXT;

CREATE INDEX "SequenceEnrollment_tenantId_dealId_idx"
ON "crm"."SequenceEnrollment"("tenantId", "dealId");

ALTER TABLE "crm"."SequenceEnrollment"
ADD CONSTRAINT "SequenceEnrollment_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "crm"."Deal"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
