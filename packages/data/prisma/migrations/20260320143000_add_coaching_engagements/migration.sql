-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- AlterEnum
ALTER TYPE "platform"."DocumentLinkEntityType" ADD VALUE IF NOT EXISTS 'COACHING_ENGAGEMENT';
ALTER TYPE "platform"."DocumentLinkEntityType" ADD VALUE IF NOT EXISTS 'COACHING_SESSION';

-- CreateEnum
CREATE TYPE "crm"."CoachingEngagementStatus" AS ENUM (
    'draft',
    'pending_payment',
    'pending_signature',
    'confirmed',
    'prep_pending',
    'ready',
    'session_done',
    'debrief_pending',
    'completed',
    'archived'
);

-- CreateEnum
CREATE TYPE "crm"."CoachingPaymentStatus" AS ENUM ('not_required', 'pending', 'captured', 'failed');

-- CreateEnum
CREATE TYPE "crm"."CoachingContractStatus" AS ENUM ('not_required', 'pending', 'signed', 'failed');

-- CreateEnum
CREATE TYPE "crm"."CoachingSessionStatus" AS ENUM ('scheduled', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "crm"."CoachingExportBundleStatus" AS ENUM ('pending', 'ready', 'failed');

-- CreateTable
CREATE TABLE "crm"."CoachingOffer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "titleJson" JSONB NOT NULL,
    "descriptionJson" JSONB,
    "currency" VARCHAR(3) NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL,
    "contractRequired" BOOLEAN NOT NULL DEFAULT true,
    "paymentRequired" BOOLEAN NOT NULL DEFAULT true,
    "localeDefault" TEXT NOT NULL DEFAULT 'en',
    "contractLabelJson" JSONB,
    "prepFormTemplateJson" JSONB,
    "debriefTemplateJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CoachingEngagement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "clientPartyId" TEXT NOT NULL,
    "coachPartyId" TEXT,
    "coachUserId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "crm"."CoachingEngagementStatus" NOT NULL DEFAULT 'draft',
    "paymentStatus" "crm"."CoachingPaymentStatus" NOT NULL DEFAULT 'pending',
    "contractStatus" "crm"."CoachingContractStatus" NOT NULL DEFAULT 'pending',
    "legalEntityId" TEXT,
    "paymentMethodId" TEXT,
    "invoiceId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripeCheckoutUrl" TEXT,
    "stripePaymentIntentId" TEXT,
    "contractAccessTokenHash" TEXT,
    "contractRequestedAt" TIMESTAMPTZ(6),
    "contractSignedAt" TIMESTAMPTZ(6),
    "contractDraftDocumentId" TEXT,
    "signedContractDocumentId" TEXT,
    "latestSummary" TEXT,
    "archivedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingEngagement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CoachingSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "status" "crm"."CoachingSessionStatus" NOT NULL DEFAULT 'scheduled',
    "sequenceNo" INTEGER NOT NULL DEFAULT 1,
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "meetingProvider" TEXT,
    "meetingLink" TEXT,
    "meetingIssuedAt" TIMESTAMPTZ(6),
    "prepAccessTokenHash" TEXT,
    "prepRequestedAt" TIMESTAMPTZ(6),
    "prepSubmittedAt" TIMESTAMPTZ(6),
    "prepDocumentId" TEXT,
    "debriefAccessTokenHash" TEXT,
    "debriefRequestedAt" TIMESTAMPTZ(6),
    "debriefSubmittedAt" TIMESTAMPTZ(6),
    "debriefDocumentId" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CoachingEngagementEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "stateFrom" "crm"."CoachingEngagementStatus",
    "stateTo" "crm"."CoachingEngagementStatus",
    "actorUserId" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingEngagementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CoachingArtifactBundle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "status" "crm"."CoachingExportBundleStatus" NOT NULL DEFAULT 'pending',
    "documentId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL,
    "completedAt" TIMESTAMPTZ(6),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingArtifactBundle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachingOffer_tenantId_workspaceId_createdAt_idx" ON "crm"."CoachingOffer"("tenantId", "workspaceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CoachingEngagement_tenantId_stripeCheckoutSessionId_key" ON "crm"."CoachingEngagement"("tenantId", "stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "CoachingEngagement_tenantId_workspaceId_status_createdAt_idx" ON "crm"."CoachingEngagement"("tenantId", "workspaceId", "status", "createdAt");
CREATE INDEX "CoachingEngagement_tenantId_clientPartyId_idx" ON "crm"."CoachingEngagement"("tenantId", "clientPartyId");
CREATE INDEX "CoachingEngagement_tenantId_coachUserId_idx" ON "crm"."CoachingEngagement"("tenantId", "coachUserId");
CREATE INDEX "CoachingEngagement_tenantId_contractAccessTokenHash_idx" ON "crm"."CoachingEngagement"("tenantId", "contractAccessTokenHash");

-- CreateIndex
CREATE INDEX "CoachingSession_tenantId_workspaceId_startAt_idx" ON "crm"."CoachingSession"("tenantId", "workspaceId", "startAt");
CREATE INDEX "CoachingSession_tenantId_engagementId_sequenceNo_idx" ON "crm"."CoachingSession"("tenantId", "engagementId", "sequenceNo");
CREATE INDEX "CoachingSession_tenantId_prepAccessTokenHash_idx" ON "crm"."CoachingSession"("tenantId", "prepAccessTokenHash");
CREATE INDEX "CoachingSession_tenantId_debriefAccessTokenHash_idx" ON "crm"."CoachingSession"("tenantId", "debriefAccessTokenHash");

-- CreateIndex
CREATE INDEX "CoachingEngagementEvent_tenantId_engagementId_occurredAt_idx" ON "crm"."CoachingEngagementEvent"("tenantId", "engagementId", "occurredAt");

-- CreateIndex
CREATE INDEX "CoachingArtifactBundle_tenantId_engagementId_requestedAt_idx" ON "crm"."CoachingArtifactBundle"("tenantId", "engagementId", "requestedAt");

-- AddForeignKey
ALTER TABLE "crm"."CoachingEngagement" ADD CONSTRAINT "CoachingEngagement_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "crm"."CoachingOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "crm"."CoachingSession" ADD CONSTRAINT "CoachingSession_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "crm"."CoachingEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm"."CoachingEngagementEvent" ADD CONSTRAINT "CoachingEngagementEvent_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "crm"."CoachingEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm"."CoachingArtifactBundle" ADD CONSTRAINT "CoachingArtifactBundle_engagementId_fkey" FOREIGN KEY ("engagementId") REFERENCES "crm"."CoachingEngagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
