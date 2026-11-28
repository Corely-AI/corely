BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE billing."Invoice" ADD COLUMN "hiddenFromList" BOOLEAN;
COMMIT;
