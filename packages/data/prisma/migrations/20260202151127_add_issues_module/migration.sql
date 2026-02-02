-- CreateEnum
CREATE TYPE "crm"."IssueStatus" AS ENUM ('NEW', 'TRIAGED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED', 'REOPENED');

-- CreateEnum
CREATE TYPE "crm"."IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "crm"."IssueSiteType" AS ENUM ('FIELD', 'CUSTOMER', 'MANUFACTURER');

-- CreateEnum
CREATE TYPE "crm"."IssueAttachmentKind" AS ENUM ('IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "crm"."IssueActivityType" AS ENUM ('CREATED', 'COMMENT_ADDED', 'STATUS_CHANGED', 'ATTACHMENT_ADDED', 'RESOLVED', 'REOPENED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "crm"."IssueTranscriptionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "crm"."Issue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "crm"."IssueStatus" NOT NULL DEFAULT 'NEW',
    "priority" "crm"."IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "siteType" "crm"."IssueSiteType" NOT NULL,
    "siteId" TEXT,
    "customerPartyId" TEXT,
    "manufacturerPartyId" TEXT,
    "assigneeUserId" TEXT,
    "reporterUserId" TEXT,
    "resolvedAt" TIMESTAMPTZ(6),
    "resolvedByUserId" TEXT,
    "closedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."IssueComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "IssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."IssueAttachment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "commentId" TEXT,
    "documentId" TEXT NOT NULL,
    "kind" "crm"."IssueAttachmentKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "transcriptText" TEXT,
    "transcriptSegmentsJson" TEXT,
    "transcriptionStatus" "crm"."IssueTranscriptionStatus",
    "transcriptionError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "IssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."IssueActivity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "type" "crm"."IssueActivityType" NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "IssueActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Issue_tenantId_status_idx" ON "crm"."Issue"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Issue_tenantId_assigneeUserId_idx" ON "crm"."Issue"("tenantId", "assigneeUserId");

-- CreateIndex
CREATE INDEX "Issue_tenantId_siteType_idx" ON "crm"."Issue"("tenantId", "siteType");

-- CreateIndex
CREATE INDEX "Issue_tenantId_createdAt_idx" ON "crm"."Issue"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "IssueComment_tenantId_issueId_createdAt_idx" ON "crm"."IssueComment"("tenantId", "issueId", "createdAt");

-- CreateIndex
CREATE INDEX "IssueAttachment_tenantId_issueId_idx" ON "crm"."IssueAttachment"("tenantId", "issueId");

-- CreateIndex
CREATE INDEX "IssueAttachment_tenantId_commentId_idx" ON "crm"."IssueAttachment"("tenantId", "commentId");

-- CreateIndex
CREATE INDEX "IssueAttachment_tenantId_documentId_idx" ON "crm"."IssueAttachment"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "IssueActivity_tenantId_issueId_createdAt_idx" ON "crm"."IssueActivity"("tenantId", "issueId", "createdAt");

-- AddForeignKey
ALTER TABLE "crm"."IssueComment" ADD CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "crm"."Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."IssueAttachment" ADD CONSTRAINT "IssueAttachment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "crm"."Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."IssueAttachment" ADD CONSTRAINT "IssueAttachment_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "crm"."IssueComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."IssueActivity" ADD CONSTRAINT "IssueActivity_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "crm"."Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
