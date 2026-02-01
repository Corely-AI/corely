-- Normalize existing currency codes to uppercase
UPDATE "platform"."LegalEntity" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "crm"."Deal" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "accounting"."AccountingSettings" SET "baseCurrency" = UPPER("baseCurrency") WHERE "baseCurrency" IS NOT NULL;
UPDATE "accounting"."JournalLine" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "billing"."BillingInvoice" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "platform"."BankAccount" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."TaxProfile" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."TaxSnapshot" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."TaxFiling" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."TaxReport" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "workflow"."CashRegister" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."Expense" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."SalesSettings" SET "defaultCurrency" = UPPER("defaultCurrency") WHERE "defaultCurrency" IS NOT NULL;
UPDATE "commerce"."PurchaseOrder" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."VendorBill" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."BillPayment" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;
UPDATE "commerce"."PurchasingSettings" SET "defaultCurrency" = UPPER("defaultCurrency") WHERE "defaultCurrency" IS NOT NULL;
UPDATE "commerce"."RentalProperty" SET "currency" = UPPER("currency") WHERE "currency" IS NOT NULL;

-- Add CHECK constraints for ISO 4217 format (3 uppercase letters)
ALTER TABLE "platform"."LegalEntity" ADD CONSTRAINT "currency_iso_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "crm"."Deal" ADD CONSTRAINT "currency_iso_check" CHECK ("currency" ~ '^[A-Z]{3}$');
ALTER TABLE "accounting"."AccountingSettings" ADD CONSTRAINT "baseCurrency_iso_check" CHECK ("baseCurrency" ~ '^[A-Z]{3}$');
ALTER TABLE "accounting"."JournalLine" ADD CONSTRAINT "currency_iso_check" CHECK ("currency" ~ '^[A-Z]{3}$');
-- Optional: repeat for other tables if needed, but these are the most critical ones.
