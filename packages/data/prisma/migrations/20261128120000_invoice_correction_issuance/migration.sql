ALTER TABLE billing."Invoice" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Invoice_one_issued_correction_per_original"
ON billing."Invoice" ("tenantId", "sourceId")
WHERE "sourceType" = 'invoice_correction' AND "number" IS NOT NULL;
