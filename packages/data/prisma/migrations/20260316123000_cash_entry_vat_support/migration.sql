-- Cash entry VAT support: add immutable tax snapshot fields and source document metadata.

ALTER TABLE "accounting"."cash_entries"
  ADD COLUMN IF NOT EXISTS "grossAmountCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "netAmountCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "taxAmountCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "taxMode" TEXT,
  ADD COLUMN IF NOT EXISTS "taxCodeId" TEXT,
  ADD COLUMN IF NOT EXISTS "taxCode" TEXT,
  ADD COLUMN IF NOT EXISTS "taxRateBps" INTEGER,
  ADD COLUMN IF NOT EXISTS "taxLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDocumentId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDocumentRef" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceDocumentKind" TEXT;

UPDATE "accounting"."cash_entries"
SET
  "grossAmountCents" = COALESCE("grossAmountCents", "amountCents"),
  "paymentMethod" = COALESCE("paymentMethod", 'CASH')
WHERE "grossAmountCents" IS NULL
   OR "paymentMethod" IS NULL;

ALTER TABLE "accounting"."cash_entries"
  ALTER COLUMN "grossAmountCents" SET NOT NULL,
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH',
  ALTER COLUMN "paymentMethod" SET NOT NULL;
