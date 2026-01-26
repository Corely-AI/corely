-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaxReportGroup" ADD VALUE 'COMPLIANCE';
ALTER TYPE "TaxReportGroup" ADD VALUE 'PAYROLL';
ALTER TYPE "TaxReportGroup" ADD VALUE 'FINANCIAL_STATEMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaxReportType" ADD VALUE 'EU_SALES_LIST';
ALTER TYPE "TaxReportType" ADD VALUE 'INTRASTAT';
ALTER TYPE "TaxReportType" ADD VALUE 'PAYROLL_TAX';
ALTER TYPE "TaxReportType" ADD VALUE 'PROFIT_LOSS';
ALTER TYPE "TaxReportType" ADD VALUE 'BALANCE_SHEET';
ALTER TYPE "TaxReportType" ADD VALUE 'TRADE_TAX';
ALTER TYPE "TaxReportType" ADD VALUE 'FIXED_ASSETS';

-- AlterTable
ALTER TABLE "TaxProfile" ADD COLUMN     "euB2BSales" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasEmployees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "usesTaxAdvisor" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaxReportLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "section" TEXT,
    "label" TEXT,
    "netAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxReportLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaxReportLine_reportId_idx" ON "TaxReportLine"("reportId");

-- AddForeignKey
ALTER TABLE "TaxReportLine" ADD CONSTRAINT "TaxReportLine_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TaxReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
