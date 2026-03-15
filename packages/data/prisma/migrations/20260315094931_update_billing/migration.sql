-- CreateEnum
CREATE TYPE "billing"."BillingTrialStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED_BY_SUBSCRIPTION');

-- CreateTable
CREATE TABLE "billing"."BillingTrial" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "status" "billing"."BillingTrialStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6) NOT NULL,
    "expiredAt" TIMESTAMPTZ(6),
    "supersededAt" TIMESTAMPTZ(6),
    "activatedByUserId" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BillingTrial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingTrial_status_endsAt_idx" ON "billing"."BillingTrial"("status", "endsAt");

-- CreateIndex
CREATE INDEX "BillingTrial_accountId_idx" ON "billing"."BillingTrial"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingTrial_tenantId_productKey_key" ON "billing"."BillingTrial"("tenantId", "productKey");

-- AddForeignKey
ALTER TABLE "billing"."BillingTrial" ADD CONSTRAINT "BillingTrial_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingTrial" ADD CONSTRAINT "BillingTrial_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "billing"."BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
