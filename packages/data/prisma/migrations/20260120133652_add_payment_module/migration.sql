-- CreateEnum
CREATE TYPE "PaymentMethodType" AS ENUM ('BANK_TRANSFER', 'PAYPAL', 'CASH', 'CARD', 'OTHER');

-- AlterTable
ALTER TABLE "SalesInvoice" ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "paymentSnapshot" JSONB;

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "iban" TEXT NOT NULL,
    "bic" TEXT,
    "bankName" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "country" CHAR(2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "type" "PaymentMethodType" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefaultForInvoicing" BOOLEAN NOT NULL DEFAULT false,
    "bankAccountId" TEXT,
    "instructions" TEXT,
    "payUrl" TEXT,
    "referenceTemplate" TEXT NOT NULL DEFAULT 'INV-{invoiceNumber}',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_legalEntityId_idx" ON "BankAccount"("tenantId", "legalEntityId");

-- CreateIndex
CREATE INDEX "BankAccount_tenantId_isDefault_idx" ON "BankAccount"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "BankAccount_legalEntityId_isDefault_idx" ON "BankAccount"("legalEntityId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccount_tenantId_legalEntityId_label_key" ON "BankAccount"("tenantId", "legalEntityId", "label");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_legalEntityId_idx" ON "PaymentMethod"("tenantId", "legalEntityId");

-- CreateIndex
CREATE INDEX "PaymentMethod_tenantId_isDefaultForInvoicing_idx" ON "PaymentMethod"("tenantId", "isDefaultForInvoicing");

-- CreateIndex
CREATE INDEX "PaymentMethod_bankAccountId_idx" ON "PaymentMethod"("bankAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_tenantId_legalEntityId_label_key" ON "PaymentMethod"("tenantId", "legalEntityId", "label");

-- CreateIndex
CREATE INDEX "SalesInvoice_paymentMethodId_idx" ON "SalesInvoice"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "BankAccount" ADD CONSTRAINT "BankAccount_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "BankAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoice" ADD CONSTRAINT "SalesInvoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
