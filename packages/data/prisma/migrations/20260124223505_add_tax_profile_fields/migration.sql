-- CreateEnum
CREATE TYPE "VatAccountingMethod" AS ENUM ('IST', 'SOLL');

-- AlterTable
ALTER TABLE "TaxProfile" ADD COLUMN     "vatAccountingMethod" "VatAccountingMethod" NOT NULL DEFAULT 'IST';
