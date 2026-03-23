CREATE TYPE "crm"."CoachingContractRequestStatus" AS ENUM ('pending', 'viewed', 'signed', 'failed');

CREATE TABLE "crm"."CoachingContractRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "clientPartyId" TEXT NOT NULL,
    "provider" VARCHAR(32) NOT NULL DEFAULT 'corely-internal',
    "status" "crm"."CoachingContractRequestStatus" NOT NULL DEFAULT 'pending',
    "requestToken" TEXT NOT NULL,
    "requestTokenHash" TEXT NOT NULL,
    "templateLocale" TEXT NOT NULL,
    "contractTitle" TEXT NOT NULL,
    "contractBody" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "signerName" TEXT,
    "signerEmail" TEXT,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL,
    "deliveredAt" TIMESTAMPTZ(6),
    "viewedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "draftDocumentId" TEXT NOT NULL,
    "signedDocumentId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CoachingContractRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CoachingContractRequest_tenantId_requestToken_key"
ON "crm"."CoachingContractRequest"("tenantId", "requestToken");

CREATE UNIQUE INDEX "CoachingContractRequest_tenantId_requestTokenHash_key"
ON "crm"."CoachingContractRequest"("tenantId", "requestTokenHash");

CREATE INDEX "CoachingContractRequest_tenantId_engagementId_requestedAt_idx"
ON "crm"."CoachingContractRequest"("tenantId", "engagementId", "requestedAt");

CREATE INDEX "CoachingContractRequest_tenantId_recipientEmail_requestedAt_idx"
ON "crm"."CoachingContractRequest"("tenantId", "recipientEmail", "requestedAt");

ALTER TABLE "crm"."CoachingContractRequest"
ADD CONSTRAINT "CoachingContractRequest_engagementId_fkey"
FOREIGN KEY ("engagementId") REFERENCES "crm"."CoachingEngagement"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
