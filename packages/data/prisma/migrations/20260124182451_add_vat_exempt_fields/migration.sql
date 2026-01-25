-- AlterEnum
ALTER TYPE "TaxRegime" ADD VALUE 'VAT_EXEMPT';

-- AlterTable
ALTER TABLE "TaxProfile" ADD COLUMN     "vatExemptionParagraph" TEXT;
