ALTER TABLE "crm"."CoachingOffer"
ADD COLUMN "coachUserId" TEXT;

CREATE TABLE "crm"."CoachingBookingHold" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "coachUserId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "startAt" TIMESTAMPTZ(6) NOT NULL,
    "endAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "bookedByName" TEXT,
    "bookedByEmail" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachingBookingHold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CoachingBookingHold_tenantId_coachUserId_status_expiresAt_idx"
ON "crm"."CoachingBookingHold"("tenantId", "coachUserId", "status", "expiresAt");

CREATE INDEX "CoachingBookingHold_tenantId_offerId_startAt_idx"
ON "crm"."CoachingBookingHold"("tenantId", "offerId", "startAt");

ALTER TABLE "crm"."CoachingBookingHold"
ADD CONSTRAINT "CoachingBookingHold_offerId_fkey"
FOREIGN KEY ("offerId") REFERENCES "crm"."CoachingOffer"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
