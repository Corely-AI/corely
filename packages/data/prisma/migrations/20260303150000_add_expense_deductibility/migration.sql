-- Migration: Add DE income-tax deductibility columns to Expense table
-- Generated: 2026-03-03

ALTER TABLE "billing"."Expense"
  ADD COLUMN IF NOT EXISTS "deductiblePercent"         INTEGER,
  ADD COLUMN IF NOT EXISTS "deductibleAmountCents"     INTEGER,
  ADD COLUMN IF NOT EXISTS "nonDeductibleAmountCents"  INTEGER,
  ADD COLUMN IF NOT EXISTS "deductibilityRuleKind"     TEXT,
  ADD COLUMN IF NOT EXISTS "deductibilityMeta"         JSONB;

-- Comment for auditors
COMMENT ON COLUMN "billing"."Expense"."deductiblePercent"        IS 'DE EStG: computed income-tax deductibility percentage (0-100). NULL = not yet computed.';
COMMENT ON COLUMN "billing"."Expense"."deductibleAmountCents"    IS 'DE EStG: deductible portion in euro cents.';
COMMENT ON COLUMN "billing"."Expense"."nonDeductibleAmountCents" IS 'DE EStG: non-deductible portion in euro cents.';
COMMENT ON COLUMN "billing"."Expense"."deductibilityRuleKind"    IS 'DE EStG: rule kind identifier (PERCENT | GIFT_THRESHOLD_PER_RECIPIENT_YEAR | PER_DIEM | MIXED_USE).';
COMMENT ON COLUMN "billing"."Expense"."deductibilityMeta"        IS 'DE EStG: JSON metadata used in computation (recipient, occasion, participants, travelMeta, homeOfficeDays, etc.).';
