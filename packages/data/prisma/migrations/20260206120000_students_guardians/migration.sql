-- Extend PartyRoleType enum
ALTER TYPE "crm"."PartyRoleType" ADD VALUE IF NOT EXISTS 'STUDENT';
ALTER TYPE "crm"."PartyRoleType" ADD VALUE IF NOT EXISTS 'GUARDIAN';

-- ClassEnrollment: rename clientId -> studentClientId and add payerClientId
ALTER TABLE "crm"."ClassEnrollment" RENAME COLUMN "clientId" TO "studentClientId";
ALTER TABLE "crm"."ClassEnrollment" ADD COLUMN "payerClientId" TEXT;

UPDATE "crm"."ClassEnrollment"
SET "payerClientId" = "studentClientId"
WHERE "payerClientId" IS NULL;

ALTER TABLE "crm"."ClassEnrollment" ALTER COLUMN "payerClientId" SET NOT NULL;

DROP INDEX IF EXISTS "crm"."ClassEnrollment_tenantId_classGroupId_clientId_key";
CREATE UNIQUE INDEX "ClassEnrollment_tenantId_classGroupId_studentClientId_key"
  ON "crm"."ClassEnrollment"("tenantId", "classGroupId", "studentClientId");

CREATE INDEX "ClassEnrollment_tenantId_payerClientId_idx"
  ON "crm"."ClassEnrollment"("tenantId", "payerClientId");

-- ClassBillingInvoiceLink: rename clientId -> payerClientId
ALTER TABLE "crm"."ClassBillingInvoiceLink" RENAME COLUMN "clientId" TO "payerClientId";

DROP INDEX IF EXISTS "crm"."ClassBillingInvoiceLink_tenantId_billingRunId_clientId_key";
CREATE UNIQUE INDEX "ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_key"
  ON "crm"."ClassBillingInvoiceLink"("tenantId", "billingRunId", "payerClientId");

DROP INDEX IF EXISTS "crm"."ClassBillingInvoiceLink_tenantId_clientId_idx";
CREATE INDEX "ClassBillingInvoiceLink_tenantId_payerClientId_idx"
  ON "crm"."ClassBillingInvoiceLink"("tenantId", "payerClientId");
