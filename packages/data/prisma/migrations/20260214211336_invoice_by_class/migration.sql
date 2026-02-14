-- RenameIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'crm'
      AND c.relkind = 'i'
      AND c.relname = 'ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_cla'
  ) THEN
    ALTER INDEX "crm"."ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_cla"
      RENAME TO "ClassBillingInvoiceLink_tenantId_billingRunId_payerClientId_key";
  END IF;
END $$;
