ALTER TABLE "crm"."CoachingOffer"
ADD COLUMN "prepFormSendHoursBeforeSession" INTEGER;

ALTER TABLE "crm"."CoachingSession"
ADD COLUMN "prepAccessToken" TEXT;
