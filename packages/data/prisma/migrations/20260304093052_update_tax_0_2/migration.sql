-- CreateEnum
CREATE TYPE "billing"."TaxDocumentLinkEntityType" AS ENUM ('FILING', 'PAYMENT');

-- AlterTable
ALTER TABLE "billing"."TaxSnapshot" ADD COLUMN     "packId" TEXT;

-- CreateTable
CREATE TABLE "billing"."TaxDocumentLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" "billing"."TaxDocumentLinkEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "TaxDocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxFilingEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(6),

    CONSTRAINT "TaxFilingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxDocumentLink_tenantId_entityType_entityId_idx" ON "billing"."TaxDocumentLink"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxDocumentLink_tenantId_entityType_entityId_documentId_key" ON "billing"."TaxDocumentLink"("tenantId", "entityType", "entityId", "documentId");

-- CreateIndex
CREATE INDEX "TaxFilingEvent_tenantId_filingId_idx" ON "billing"."TaxFilingEvent"("tenantId", "filingId");

-- CreateIndex
CREATE INDEX "TaxFilingEvent_processedAt_idx" ON "billing"."TaxFilingEvent"("processedAt");
