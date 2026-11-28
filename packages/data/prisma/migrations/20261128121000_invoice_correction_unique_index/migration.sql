CREATE UNIQUE INDEX CONCURRENTLY "Invoice_one_issued_correction_per_original"
ON billing."Invoice" ("tenantId", "sourceId")
WHERE "sourceType" = 'invoice_correction' AND "number" IS NOT NULL;
