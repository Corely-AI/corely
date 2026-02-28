-- Cash Management full features: entry sequencing, day locks, attachments, denomination counts, and exports.

-- Registers
ALTER TABLE "accounting"."cash_registers"
  ADD COLUMN IF NOT EXISTS "disallowNegativeBalance" BOOLEAN NOT NULL DEFAULT false;

-- Entries
ALTER TABLE "accounting"."cash_entries"
  ADD COLUMN IF NOT EXISTS "entryNo" INTEGER,
  ADD COLUMN IF NOT EXISTS "direction" TEXT,
  ADD COLUMN IF NOT EXISTS "entryType" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "currency" CHAR(3),
  ADD COLUMN IF NOT EXISTS "occurredAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "dayKey" TEXT,
  ADD COLUMN IF NOT EXISTS "balanceAfterCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "reversalOfEntryId" TEXT,
  ADD COLUMN IF NOT EXISTS "reversedByEntryId" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedByDayCloseId" TEXT;

UPDATE "accounting"."cash_entries"
SET
  "occurredAt" = COALESCE("occurredAt", "createdAt"),
  "dayKey" = COALESCE("dayKey", "businessDate", to_char(COALESCE("occurredAt", "createdAt"), 'YYYY-MM-DD')),
  "direction" = COALESCE(
    "direction",
    CASE WHEN "type" = 'OUT' THEN 'OUT' ELSE 'IN' END
  ),
  "entryType" = COALESCE(
    "entryType",
    CASE
      WHEN "type" = 'IN' AND "sourceType" = 'SALES' THEN 'SALE_CASH'
      WHEN "type" = 'OUT' AND "sourceType" = 'EXPENSE' THEN 'EXPENSE_CASH'
      WHEN "sourceType" = 'DIFFERENCE' THEN 'CLOSING_ADJUSTMENT'
      WHEN "type" = 'OUT' THEN 'OWNER_WITHDRAWAL'
      ELSE 'OWNER_DEPOSIT'
    END
  ),
  "source" = COALESCE("source", "sourceType", 'MANUAL'),
  "paymentMethod" = COALESCE("paymentMethod", 'CASH'),
  "balanceAfterCents" = COALESCE("balanceAfterCents", 0);

UPDATE "accounting"."cash_entries" e
SET "currency" = COALESCE(e."currency", r."currency", 'EUR')
FROM "accounting"."cash_registers" r
WHERE e."registerId" = r."id";

WITH ranked AS (
  SELECT
    e."id",
    ROW_NUMBER() OVER (
      PARTITION BY e."tenantId", e."workspaceId", e."registerId"
      ORDER BY COALESCE(e."occurredAt", e."createdAt"), e."createdAt", e."id"
    ) AS entry_no
  FROM "accounting"."cash_entries" e
)
UPDATE "accounting"."cash_entries" e
SET "entryNo" = ranked.entry_no
FROM ranked
WHERE e."id" = ranked."id"
  AND e."entryNo" IS NULL;

WITH running_balance AS (
  SELECT
    e."id",
    SUM(
      CASE WHEN e."direction" = 'OUT' THEN -e."amountCents" ELSE e."amountCents" END
    ) OVER (
      PARTITION BY e."tenantId", e."workspaceId", e."registerId"
      ORDER BY e."occurredAt", e."createdAt", e."id"
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS balance_after
  FROM "accounting"."cash_entries" e
)
UPDATE "accounting"."cash_entries" e
SET "balanceAfterCents" = rb.balance_after
FROM running_balance rb
WHERE e."id" = rb."id";

ALTER TABLE "accounting"."cash_entries"
  ALTER COLUMN "paymentMethod" SET DEFAULT 'CASH',
  ALTER COLUMN "currency" SET DEFAULT 'EUR',
  ALTER COLUMN "occurredAt" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "balanceAfterCents" SET DEFAULT 0,
  ALTER COLUMN "entryNo" SET NOT NULL,
  ALTER COLUMN "direction" SET NOT NULL,
  ALTER COLUMN "entryType" SET NOT NULL,
  ALTER COLUMN "source" SET NOT NULL,
  ALTER COLUMN "paymentMethod" SET NOT NULL,
  ALTER COLUMN "currency" SET NOT NULL,
  ALTER COLUMN "occurredAt" SET NOT NULL,
  ALTER COLUMN "dayKey" SET NOT NULL,
  ALTER COLUMN "balanceAfterCents" SET NOT NULL;

-- Day closes
ALTER TABLE "accounting"."cash_day_closes"
  ADD COLUMN IF NOT EXISTS "dayKey" TEXT,
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "submittedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "lockedByUserId" TEXT;

UPDATE "accounting"."cash_day_closes"
SET
  "dayKey" = COALESCE("dayKey", "businessDate"),
  "note" = COALESCE("note", "notes"),
  "status" = CASE
    WHEN "status" = 'OPEN' THEN 'DRAFT'
    WHEN "status" = 'LOCKED' THEN 'SUBMITTED'
    ELSE "status"
  END,
  "submittedAt" = COALESCE("submittedAt", "closedAt"),
  "submittedByUserId" = COALESCE("submittedByUserId", "closedByUserId"),
  "lockedAt" = COALESCE("lockedAt", "closedAt"),
  "lockedByUserId" = COALESCE("lockedByUserId", "closedByUserId");

ALTER TABLE "accounting"."cash_day_closes"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  ALTER COLUMN "dayKey" SET NOT NULL;

-- Entry counters
CREATE TABLE IF NOT EXISTS "accounting"."cash_entry_counters" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "registerId" TEXT NOT NULL,
  "lastEntryNo" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "cash_entry_counters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cash_entry_counters_tenantId_workspaceId_registerId_key"
  ON "accounting"."cash_entry_counters"("tenantId", "workspaceId", "registerId");

CREATE INDEX IF NOT EXISTS "cash_entry_counters_tenantId_workspaceId_registerId_idx"
  ON "accounting"."cash_entry_counters"("tenantId", "workspaceId", "registerId");

INSERT INTO "accounting"."cash_entry_counters" (
  "id",
  "tenantId",
  "workspaceId",
  "registerId",
  "lastEntryNo",
  "updatedAt"
)
SELECT
  md5(e."tenantId" || ':' || e."workspaceId" || ':' || e."registerId" || ':counter'),
  e."tenantId",
  e."workspaceId",
  e."registerId",
  MAX(e."entryNo"),
  CURRENT_TIMESTAMP
FROM "accounting"."cash_entries" e
GROUP BY e."tenantId", e."workspaceId", e."registerId"
ON CONFLICT ("tenantId", "workspaceId", "registerId")
DO UPDATE SET
  "lastEntryNo" = GREATEST("accounting"."cash_entry_counters"."lastEntryNo", EXCLUDED."lastEntryNo"),
  "updatedAt" = CURRENT_TIMESTAMP;

-- Day close denomination lines
CREATE TABLE IF NOT EXISTS "accounting"."cash_day_close_count_lines" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "dayCloseId" TEXT NOT NULL,
  "denominationCents" INTEGER NOT NULL,
  "count" INTEGER NOT NULL,
  "subtotalCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_day_close_count_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cash_day_close_count_lines_dayCloseId_denominationCents_key"
  ON "accounting"."cash_day_close_count_lines"("dayCloseId", "denominationCents");

CREATE INDEX IF NOT EXISTS "cash_day_close_count_lines_tenantId_workspaceId_dayCloseId_idx"
  ON "accounting"."cash_day_close_count_lines"("tenantId", "workspaceId", "dayCloseId");

-- Attachments
CREATE TABLE IF NOT EXISTS "accounting"."cash_entry_attachments" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "entryId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "cash_entry_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cash_entry_attachments_tenantId_workspaceId_entryId_documentId_key"
  ON "accounting"."cash_entry_attachments"("tenantId", "workspaceId", "entryId", "documentId");

CREATE INDEX IF NOT EXISTS "cash_entry_attachments_tenantId_workspaceId_entryId_idx"
  ON "accounting"."cash_entry_attachments"("tenantId", "workspaceId", "entryId");

CREATE INDEX IF NOT EXISTS "cash_entry_attachments_tenantId_workspaceId_documentId_idx"
  ON "accounting"."cash_entry_attachments"("tenantId", "workspaceId", "documentId");

-- Export artifacts
CREATE TABLE IF NOT EXISTS "accounting"."cash_export_artifacts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "registerId" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentBase64" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(6),
  CONSTRAINT "cash_export_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cash_export_artifacts_tenantId_workspaceId_registerId_month_format_idx"
  ON "accounting"."cash_export_artifacts"("tenantId", "workspaceId", "registerId", "month", "format");

CREATE INDEX IF NOT EXISTS "cash_export_artifacts_tenantId_workspaceId_createdAt_idx"
  ON "accounting"."cash_export_artifacts"("tenantId", "workspaceId", "createdAt");

-- Index refresh
DROP INDEX IF EXISTS "accounting"."cash_entries_tenantId_registerId_businessDate_idx";
DROP INDEX IF EXISTS "accounting"."cash_entries_workspaceId_registerId_businessDate_idx";
DROP INDEX IF EXISTS "accounting"."cash_entries_tenantId_createdAt_idx";
DROP INDEX IF EXISTS "accounting"."cash_day_closes_tenantId_idx";
DROP INDEX IF EXISTS "accounting"."cash_day_closes_workspaceId_idx";
DROP INDEX IF EXISTS "accounting"."cash_day_closes_registerId_businessDate_key";

CREATE UNIQUE INDEX IF NOT EXISTS "cash_entries_tenantId_workspaceId_registerId_entryNo_key"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "registerId", "entryNo");

CREATE UNIQUE INDEX IF NOT EXISTS "cash_entries_reversedByEntryId_key"
  ON "accounting"."cash_entries"("reversedByEntryId");

CREATE INDEX IF NOT EXISTS "cash_entries_tenantId_workspaceId_registerId_dayKey_occurredAt_idx"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "registerId", "dayKey", "occurredAt");

CREATE INDEX IF NOT EXISTS "cash_entries_tenantId_workspaceId_registerId_occurredAt_idx"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "registerId", "occurredAt");

CREATE INDEX IF NOT EXISTS "cash_entries_tenantId_workspaceId_reversalOfEntryId_idx"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "reversalOfEntryId");

CREATE INDEX IF NOT EXISTS "cash_entries_tenantId_workspaceId_lockedByDayCloseId_idx"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "lockedByDayCloseId");

CREATE UNIQUE INDEX IF NOT EXISTS "cash_day_closes_tenantId_workspaceId_registerId_dayKey_key"
  ON "accounting"."cash_day_closes"("tenantId", "workspaceId", "registerId", "dayKey");

CREATE INDEX IF NOT EXISTS "cash_day_closes_tenantId_workspaceId_registerId_dayKey_idx"
  ON "accounting"."cash_day_closes"("tenantId", "workspaceId", "registerId", "dayKey");

CREATE INDEX IF NOT EXISTS "cash_day_closes_tenantId_workspaceId_registerId_submittedAt_idx"
  ON "accounting"."cash_day_closes"("tenantId", "workspaceId", "registerId", "submittedAt");

-- Foreign keys and constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_entry_counters_registerId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_entry_counters"
      ADD CONSTRAINT "cash_entry_counters_registerId_fkey"
      FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_entries_reversalOfEntryId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_entries"
      ADD CONSTRAINT "cash_entries_reversalOfEntryId_fkey"
      FOREIGN KEY ("reversalOfEntryId") REFERENCES "accounting"."cash_entries"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_entries_lockedByDayCloseId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_entries"
      ADD CONSTRAINT "cash_entries_lockedByDayCloseId_fkey"
      FOREIGN KEY ("lockedByDayCloseId") REFERENCES "accounting"."cash_day_closes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_day_close_count_lines_dayCloseId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_day_close_count_lines"
      ADD CONSTRAINT "cash_day_close_count_lines_dayCloseId_fkey"
      FOREIGN KEY ("dayCloseId") REFERENCES "accounting"."cash_day_closes"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_entry_attachments_entryId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_entry_attachments"
      ADD CONSTRAINT "cash_entry_attachments_entryId_fkey"
      FOREIGN KEY ("entryId") REFERENCES "accounting"."cash_entries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cash_export_artifacts_registerId_fkey'
  ) THEN
    ALTER TABLE "accounting"."cash_export_artifacts"
      ADD CONSTRAINT "cash_export_artifacts_registerId_fkey"
      FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
