-- CreateEnum
CREATE TYPE "crm"."PartyLifecycleStatus" AS ENUM ('LEAD', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "platform"."FormPostSubmitAction" AS ENUM ('NONE', 'CREATE_TUTORING_LEAD');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "platform"."DocumentLinkEntityType" ADD VALUE 'CLASS_GROUP';
ALTER TYPE "platform"."DocumentLinkEntityType" ADD VALUE 'CLASS_SESSION';
ALTER TYPE "platform"."DocumentLinkEntityType" ADD VALUE 'PARTY';

-- AlterTable
ALTER TABLE "crm"."Party" ADD COLUMN     "lifecycleStatus" "crm"."PartyLifecycleStatus" NOT NULL DEFAULT 'LEAD';

-- AlterTable
ALTER TABLE "platform"."FormDefinition" ADD COLUMN     "postSubmitAction" "platform"."FormPostSubmitAction" NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "crm"."PartyLifecycleTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "fromStatus" "crm"."PartyLifecycleStatus",
    "toStatus" "crm"."PartyLifecycleStatus" NOT NULL,
    "reason" TEXT,
    "changedByUserId" TEXT,
    "changedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartyLifecycleTransition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyLifecycleTransition_tenantId_partyId_changedAt_idx" ON "crm"."PartyLifecycleTransition"("tenantId", "partyId", "changedAt");

-- AddForeignKey
ALTER TABLE "crm"."PartyLifecycleTransition" ADD CONSTRAINT "PartyLifecycleTransition_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
