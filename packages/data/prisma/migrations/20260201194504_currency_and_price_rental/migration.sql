/*
  Warnings:

  - You are about to alter the column `baseCurrency` on the `AccountingSettings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `JournalLine` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `Expense` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `TaxProfile` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `TaxReport` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `TaxSnapshot` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `VatPeriodSummary` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `BillPayment` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `PurchaseOrder` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `defaultCurrency` on the `PurchasingSettings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `defaultCurrency` on the `SalesSettings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `VendorBill` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.
  - You are about to alter the column `currency` on the `Deal` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(3)`.

*/
-- AlterTable
ALTER TABLE "accounting"."AccountingSettings" ALTER COLUMN "baseCurrency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "accounting"."JournalLine" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "accounting"."cash_registers" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."BankAccount" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."Expense" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."Invoice" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."TaxProfile" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."TaxReport" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."TaxSnapshot" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "billing"."VatPeriodSummary" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "commerce"."BillPayment" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "commerce"."PurchaseOrder" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "commerce"."PurchasingSettings" ALTER COLUMN "defaultCurrency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "commerce"."SalesSettings" ALTER COLUMN "defaultCurrency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "commerce"."VendorBill" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "content"."RentalProperty" ADD COLUMN     "currency" VARCHAR(3),
ADD COLUMN     "price" DECIMAL(19,4);

-- AlterTable
ALTER TABLE "crm"."Deal" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- AlterTable
ALTER TABLE "platform"."LegalEntity" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);
