-- CreateEnum
CREATE TYPE "TaxReportStatus" AS ENUM ('UPCOMING', 'OPEN', 'SUBMITTED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TaxReportType" AS ENUM ('VAT_ADVANCE', 'VAT_ANNUAL', 'INCOME_TAX');

-- CreateEnum
CREATE TYPE "TaxReportGroup" AS ENUM ('ADVANCE_VAT', 'ANNUAL_REPORT');

-- AlterTable
ALTER TABLE "TaxProfile"
  ADD COLUMN "vatEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "taxYearStartMonth" INTEGER,
  ADD COLUMN "localTaxOfficeName" TEXT;

-- CreateTable
CREATE TABLE "TaxConsultant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxConsultant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaxConsultant_tenantId_name_key" ON "TaxConsultant"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TaxConsultant_tenantId_idx" ON "TaxConsultant"("tenantId");

-- CreateTable
CREATE TABLE "TaxReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "TaxReportType" NOT NULL,
    "group" "TaxReportGroup" NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "dueDate" TIMESTAMPTZ(6) NOT NULL,
    "status" "TaxReportStatus" NOT NULL,
    "amountEstimatedCents" INTEGER,
    "amountFinalCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "submittedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxReport_tenantId_status_idx" ON "TaxReport"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TaxReport_tenantId_periodStart_periodEnd_idx" ON "TaxReport"("tenantId", "periodStart", "periodEnd");
