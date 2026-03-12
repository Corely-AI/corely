-- Create new enum with richer ERiC job outcome states.
CREATE TYPE "billing"."TaxEricJobStatus_new" AS ENUM (
  'QUEUED',
  'RUNNING',
  'VALIDATION_FAILED',
  'SUBMISSION_FAILED',
  'TECHNICAL_FAILED',
  'SUCCEEDED',
  'SUCCEEDED_WITH_WARNINGS'
);

ALTER TABLE "billing"."TaxEricJob"
ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "billing"."TaxEricJob"
ALTER COLUMN "status" TYPE "billing"."TaxEricJobStatus_new"
USING (
  CASE
    WHEN "status"::text = 'FAILED' THEN 'TECHNICAL_FAILED'::"billing"."TaxEricJobStatus_new"
    ELSE "status"::text::"billing"."TaxEricJobStatus_new"
  END
);

DROP TYPE "billing"."TaxEricJobStatus";

ALTER TYPE "billing"."TaxEricJobStatus_new"
RENAME TO "TaxEricJobStatus";

ALTER TABLE "billing"."TaxEricJob"
ADD COLUMN "certificateReferenceId" VARCHAR(128),
ADD COLUMN "correlationId" TEXT,
ADD COLUMN "declarationType" VARCHAR(64),
ADD COLUMN "ericVersion" VARCHAR(64),
ADD COLUMN "gatewayVersion" VARCHAR(64),
ADD COLUMN "idempotencyKey" TEXT,
ADD COLUMN "messages" JSONB,
ADD COLUMN "outcome" VARCHAR(64),
ADD COLUMN "payloadVersion" VARCHAR(64),
ADD COLUMN "requestHash" VARCHAR(128),
ADD COLUMN "resultCodes" JSONB,
ADD COLUMN "technicalDetails" JSONB,
ADD COLUMN "transferReference" VARCHAR(128);

CREATE INDEX "TaxEricJob_tenantId_reportId_action_idempotencyKey_idx"
ON "billing"."TaxEricJob"("tenantId", "reportId", "action", "idempotencyKey");
