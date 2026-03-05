-- CreateEnum
CREATE TYPE "billing"."TaxEricJobAction" AS ENUM ('VALIDATE', 'SUBMIT');

-- CreateEnum
CREATE TYPE "billing"."TaxEricJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "billing"."TaxReportSection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportType" VARCHAR(64) NOT NULL,
    "sectionKey" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "completion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "validationErrors" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing"."TaxEricJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reportType" VARCHAR(64) NOT NULL,
    "action" "billing"."TaxEricJobAction" NOT NULL,
    "status" "billing"."TaxEricJobStatus" NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "artifacts" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMPTZ(6),
    "finishedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxEricJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReportSection_tenantId_reportId_sectionKey_key" ON "billing"."TaxReportSection"("tenantId", "reportId", "sectionKey");

-- CreateIndex
CREATE INDEX "TaxReportSection_tenantId_filingId_idx" ON "billing"."TaxReportSection"("tenantId", "filingId");

-- CreateIndex
CREATE INDEX "TaxEricJob_tenantId_reportId_createdAt_idx" ON "billing"."TaxEricJob"("tenantId", "reportId", "createdAt");

-- CreateIndex
CREATE INDEX "TaxEricJob_tenantId_status_createdAt_idx" ON "billing"."TaxEricJob"("tenantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "billing"."TaxReportSection" ADD CONSTRAINT "TaxReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "billing"."TaxReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing"."TaxEricJob" ADD CONSTRAINT "TaxEricJob_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "billing"."TaxReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
