-- CreateEnum
CREATE TYPE "crm"."ClassBillingMonthStrategy" AS ENUM ('PREPAID_CURRENT_MONTH', 'ARREARS_PREVIOUS_MONTH');

-- CreateEnum
CREATE TYPE "crm"."ClassBillingBasis" AS ENUM ('SCHEDULED_SESSIONS', 'ATTENDED_SESSIONS');

-- AlterTable
ALTER TABLE "crm"."ClassMonthlyBillingRun"
ADD COLUMN "billingMonthStrategy" "crm"."ClassBillingMonthStrategy" NOT NULL DEFAULT 'ARREARS_PREVIOUS_MONTH',
ADD COLUMN "billingBasis" "crm"."ClassBillingBasis" NOT NULL DEFAULT 'ATTENDED_SESSIONS',
ADD COLUMN "billingSnapshot" JSONB;

-- Backfill classes billing settings for existing workspaces (preserve current arrears behavior)
INSERT INTO "ext"."ExtKv" ("id", "tenantId", "moduleId", "scope", "key", "value", "createdAt", "updatedAt")
SELECT
  CONCAT('classes-billing-', w."id"),
  w."tenantId",
  'classes',
  CONCAT('workspace:', w."id"),
  'billing-settings',
  jsonb_build_object(
    'billingMonthStrategy', 'ARREARS_PREVIOUS_MONTH',
    'billingBasis', 'ATTENDED_SESSIONS'
  ),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "platform"."Workspace" w
LEFT JOIN "ext"."ExtKv" kv
  ON kv."tenantId" = w."tenantId"
 AND kv."moduleId" = 'classes'
 AND kv."scope" = CONCAT('workspace:', w."id")
 AND kv."key" = 'billing-settings'
WHERE kv."id" IS NULL
  AND w."deletedAt" IS NULL;
