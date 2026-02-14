-- Allow multiple invoices per payer in a billing run by scoping links per class group
ALTER TABLE "crm"."ClassBillingInvoiceLink"
ADD COLUMN IF NOT EXISTS "classGroupId" TEXT;

DROP INDEX IF EXISTS "crm"."ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_key";
DROP INDEX IF EXISTS "crm"."ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_cla";

CREATE UNIQUE INDEX IF NOT EXISTS "ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_key"
  ON "crm"."ClassBillingInvoiceLink"("tenantId", "billingRunId", "payerClientId", "classGroupId");

CREATE INDEX IF NOT EXISTS "ClassBillingInvoiceLink_tenantId_classGroupId_idx"
  ON "crm"."ClassBillingInvoiceLink"("tenantId", "classGroupId");
