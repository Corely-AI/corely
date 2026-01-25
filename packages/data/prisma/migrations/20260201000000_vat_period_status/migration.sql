-- Extend tax report statuses
ALTER TYPE "TaxReportStatus" ADD VALUE IF NOT EXISTS 'PAID';
ALTER TYPE "TaxReportStatus" ADD VALUE IF NOT EXISTS 'NIL';
ALTER TYPE "TaxReportStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Replace VAT period status enum to support overdue/submitted flows
ALTER TYPE "VatPeriodStatus" RENAME TO "VatPeriodStatus_old";
CREATE TYPE "VatPeriodStatus" AS ENUM ('OPEN', 'OVERDUE', 'SUBMITTED', 'PAID', 'NIL', 'ARCHIVED');
ALTER TABLE "VatPeriodSummary" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VatPeriodSummary"
  ALTER COLUMN "status" TYPE "VatPeriodStatus"
  USING (
    CASE
      WHEN "status"::text = 'FINALIZED' THEN 'SUBMITTED'
      ELSE "status"::text
    END
  )::"VatPeriodStatus";
ALTER TABLE "VatPeriodSummary" ALTER COLUMN "status" SET DEFAULT 'OPEN';
DROP TYPE "VatPeriodStatus_old";

-- Extend TaxReport metadata + enforce unique period per report type
ALTER TABLE "TaxReport"
  ADD COLUMN "submissionReference" TEXT,
  ADD COLUMN "submissionNotes" TEXT,
  ADD COLUMN "archivedReason" TEXT,
  ADD COLUMN "pdfStorageKey" TEXT,
  ADD COLUMN "pdfGeneratedAt" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "TaxReport_tenantId_type_periodStart_periodEnd_key"
  ON "TaxReport"("tenantId", "type", "periodStart", "periodEnd");
