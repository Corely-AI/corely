/*
  Warnings:

  - You are about to drop the `SalesInvoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesInvoiceLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesQuote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesQuoteLine` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SalesInvoice" DROP CONSTRAINT "SalesInvoice_paymentMethodId_fkey";

-- DropForeignKey
ALTER TABLE "SalesInvoiceLine" DROP CONSTRAINT "SalesInvoiceLine_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_orderId_fkey";

-- DropForeignKey
ALTER TABLE "SalesPayment" DROP CONSTRAINT "SalesPayment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "SalesQuoteLine" DROP CONSTRAINT "SalesQuoteLine_quoteId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentDetails" JSONB,
ADD COLUMN     "sourceId" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- DropTable
DROP TABLE "SalesInvoice";

-- DropTable
DROP TABLE "SalesInvoiceLine";

-- DropTable
DROP TABLE "SalesOrder";

-- DropTable
DROP TABLE "SalesOrderLine";

-- DropTable
DROP TABLE "SalesPayment";

-- DropTable
DROP TABLE "SalesQuote";

-- DropTable
DROP TABLE "SalesQuoteLine";

-- DropEnum
DROP TYPE "SalesInvoiceStatus";

-- DropEnum
DROP TYPE "SalesPaymentMethod";
