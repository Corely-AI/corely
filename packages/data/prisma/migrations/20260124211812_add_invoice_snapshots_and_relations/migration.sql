-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "issuerSnapshot" JSONB,
ADD COLUMN     "legalEntityId" TEXT,
ADD COLUMN     "paymentMethodId" TEXT,
ADD COLUMN     "paymentSnapshot" JSONB,
ADD COLUMN     "taxSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Invoice_legalEntityId_idx" ON "Invoice"("legalEntityId");

-- CreateIndex
CREATE INDEX "Invoice_paymentMethodId_idx" ON "Invoice"("paymentMethodId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
