-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'SENT';
ALTER TYPE "InvoiceStatus" ADD VALUE 'CANCELED';

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "clientId",
DROP COLUMN "custom",
DROP COLUMN "totalCents",
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "number" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "terms" TEXT;

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "Invoice"("tenantId", "number");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
