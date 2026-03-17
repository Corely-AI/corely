-- CreateEnum
CREATE TYPE "billing"."BillingProviderKind" AS ENUM ('STRIPE');

-- CreateEnum
CREATE TYPE "billing"."BillingSubscriptionStatus" AS ENUM ('FREE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'UNPAID');

-- CreateEnum
CREATE TYPE "billing"."BillingProviderEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- CreateTable
CREATE TABLE "billing"."BillingAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "billing"."BillingProviderKind",
    "providerCustomerRef" TEXT,
    "billingCurrency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "email" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BillingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."BillingSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "provider" "billing"."BillingProviderKind",
    "providerSubscriptionRef" TEXT,
    "providerPriceRef" TEXT,
    "status" "billing"."BillingSubscriptionStatus" NOT NULL DEFAULT 'FREE',
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMPTZ(6),
    "trialEndsAt" TIMESTAMPTZ(6),
    "rawSnapshotJson" JSONB,
    "lastSyncedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."BillingUsageCounter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productKey" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BillingUsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."BillingProviderEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT,
    "provider" "billing"."BillingProviderKind" NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "billing"."BillingProviderEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BillingProviderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_tenantId_key" ON "billing"."BillingAccount"("tenantId");

-- CreateIndex
CREATE INDEX "BillingAccount_provider_providerCustomerRef_idx" ON "billing"."BillingAccount"("provider", "providerCustomerRef");

-- CreateIndex
CREATE INDEX "BillingSubscription_accountId_idx" ON "billing"."BillingSubscription"("accountId");

-- CreateIndex
CREATE INDEX "BillingSubscription_tenantId_productKey_status_idx" ON "billing"."BillingSubscription"("tenantId", "productKey", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_tenantId_productKey_key" ON "billing"."BillingSubscription"("tenantId", "productKey");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_provider_providerSubscriptionRef_key" ON "billing"."BillingSubscription"("provider", "providerSubscriptionRef");

-- CreateIndex
CREATE INDEX "BillingUsageCounter_tenantId_productKey_metricKey_idx" ON "billing"."BillingUsageCounter"("tenantId", "productKey", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "BillingUsageCounter_tenantId_productKey_metricKey_periodSta_key" ON "billing"."BillingUsageCounter"("tenantId", "productKey", "metricKey", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "BillingProviderEvent_tenantId_createdAt_idx" ON "billing"."BillingProviderEvent"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "BillingProviderEvent_accountId_idx" ON "billing"."BillingProviderEvent"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProviderEvent_provider_externalEventId_key" ON "billing"."BillingProviderEvent"("provider", "externalEventId");

-- AddForeignKey
ALTER TABLE "billing"."BillingAccount" ADD CONSTRAINT "BillingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingSubscription" ADD CONSTRAINT "BillingSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingSubscription" ADD CONSTRAINT "BillingSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "billing"."BillingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingUsageCounter" ADD CONSTRAINT "BillingUsageCounter_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingProviderEvent" ADD CONSTRAINT "BillingProviderEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."BillingProviderEvent" ADD CONSTRAINT "BillingProviderEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "billing"."BillingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
