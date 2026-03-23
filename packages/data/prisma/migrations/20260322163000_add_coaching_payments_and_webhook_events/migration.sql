CREATE TYPE "crm"."CoachingPaymentRecordStatus" AS ENUM ('pending', 'captured', 'failed', 'refunded');

CREATE TABLE "crm"."CoachingPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "engagementId" TEXT NOT NULL,
    "sessionId" TEXT,
    "provider" VARCHAR(32) NOT NULL,
    "status" "crm"."CoachingPaymentRecordStatus" NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "refundedAmountCents" INTEGER NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL,
    "customerEmail" TEXT,
    "providerCheckoutSessionId" TEXT,
    "providerCheckoutUrl" TEXT,
    "providerPaymentRef" TEXT,
    "providerRefundRef" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "checkoutCreatedAt" TIMESTAMPTZ(6),
    "capturedAt" TIMESTAMPTZ(6),
    "failedAt" TIMESTAMPTZ(6),
    "refundedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingPayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm"."CoachingPaymentProviderEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "engagementId" TEXT,
    "paymentId" TEXT,
    "payloadJson" JSONB NOT NULL DEFAULT '{}',
    "processedAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingPaymentProviderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachingPayment_tenantId_provider_providerCheckoutSessionId_key"
ON "crm"."CoachingPayment"("tenantId", "provider", "providerCheckoutSessionId");

CREATE INDEX "CoachingPayment_tenantId_engagementId_createdAt_idx"
ON "crm"."CoachingPayment"("tenantId", "engagementId", "createdAt");

CREATE INDEX "CoachingPayment_tenantId_provider_providerPaymentRef_idx"
ON "crm"."CoachingPayment"("tenantId", "provider", "providerPaymentRef");

CREATE UNIQUE INDEX "CoachingPaymentProviderEvent_tenantId_provider_providerEventId_key"
ON "crm"."CoachingPaymentProviderEvent"("tenantId", "provider", "providerEventId");

CREATE INDEX "CoachingPaymentProviderEvent_tenantId_engagementId_processedAt_idx"
ON "crm"."CoachingPaymentProviderEvent"("tenantId", "engagementId", "processedAt");

ALTER TABLE "crm"."CoachingPayment"
ADD CONSTRAINT "CoachingPayment_engagementId_fkey"
FOREIGN KEY ("engagementId") REFERENCES "crm"."CoachingEngagement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
