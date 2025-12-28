-- CreateEnum
CREATE TYPE "PdfStatus" AS ENUM ('NONE', 'GENERATING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "pdfFailureReason" TEXT,
ADD COLUMN     "pdfGeneratedAt" TIMESTAMPTZ(6),
ADD COLUMN     "pdfSourceVersion" TEXT,
ADD COLUMN     "pdfStatus" "PdfStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "pdfStorageKey" TEXT;
