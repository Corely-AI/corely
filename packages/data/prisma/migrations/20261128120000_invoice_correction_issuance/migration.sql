BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE billing."Invoice" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE billing."InvoiceLine" ADD COLUMN "draftQuantity" DOUBLE PRECISION;
COMMIT;
