-- CreateEnum
CREATE TYPE "crm"."PartyKind" AS ENUM ('INDIVIDUAL', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "crm"."PartyRelationshipType" AS ENUM ('WORKS_FOR', 'SUBSIDIARY_OF', 'PARTNER_OF');

-- CreateEnum
CREATE TYPE "crm"."LeadStatus" AS ENUM ('NEW', 'QUALIFIED', 'DISQUALIFIED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "crm"."LeadSource" AS ENUM ('WEB_FORM', 'MANUAL', 'IMPORT', 'REFERRAL', 'OTHER');

-- CreateEnum
CREATE TYPE "crm"."SequenceStepType" AS ENUM ('EMAIL_AUTO', 'EMAIL_MANUAL', 'CALL', 'TASK');

-- CreateEnum
CREATE TYPE "crm"."SequenceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "crm"."EnrollmentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');

-- AlterTable
ALTER TABLE "crm"."Activity" ADD COLUMN     "attendees" JSONB,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "outcome" TEXT;

-- AlterTable
ALTER TABLE "crm"."Deal" ADD COLUMN     "companyId" TEXT;

-- AlterTable
ALTER TABLE "crm"."Party" ADD COLUMN     "department" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "industry" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "kind" "crm"."PartyKind" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "organizationName" TEXT,
ADD COLUMN     "size" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "crm"."PartyRelationship" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fromPartyId" TEXT NOT NULL,
    "toPartyId" TEXT NOT NULL,
    "type" "crm"."PartyRelationshipType" NOT NULL,
    "title" TEXT,

    CONSTRAINT "PartyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Lead" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "source" "crm"."LeadSource" NOT NULL DEFAULT 'MANUAL',
    "status" "crm"."LeadStatus" NOT NULL DEFAULT 'NEW',
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "ownerUserId" TEXT,
    "convertedDealId" TEXT,
    "convertedPartyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."Sequence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."SequenceStep" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "type" "crm"."SequenceStepType" NOT NULL,
    "dayDelay" INTEGER NOT NULL DEFAULT 0,
    "templateSubject" TEXT,
    "templateBody" TEXT,

    CONSTRAINT "SequenceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."SequenceEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sequenceId" TEXT NOT NULL,
    "leadId" TEXT,
    "partyId" TEXT,
    "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
    "status" "crm"."EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "nextExecutionAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SequenceEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartyRelationship_tenantId_fromPartyId_idx" ON "crm"."PartyRelationship"("tenantId", "fromPartyId");

-- CreateIndex
CREATE INDEX "PartyRelationship_tenantId_toPartyId_idx" ON "crm"."PartyRelationship"("tenantId", "toPartyId");

-- CreateIndex
CREATE UNIQUE INDEX "PartyRelationship_tenantId_fromPartyId_toPartyId_type_key" ON "crm"."PartyRelationship"("tenantId", "fromPartyId", "toPartyId", "type");

-- CreateIndex
CREATE INDEX "Lead_tenantId_email_idx" ON "crm"."Lead"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Sequence_tenantId_idx" ON "crm"."Sequence"("tenantId");

-- CreateIndex
CREATE INDEX "SequenceStep_tenantId_sequenceId_idx" ON "crm"."SequenceStep"("tenantId", "sequenceId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_tenantId_sequenceId_idx" ON "crm"."SequenceEnrollment"("tenantId", "sequenceId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_tenantId_leadId_idx" ON "crm"."SequenceEnrollment"("tenantId", "leadId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_tenantId_partyId_idx" ON "crm"."SequenceEnrollment"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "SequenceEnrollment_tenantId_nextExecutionAt_idx" ON "crm"."SequenceEnrollment"("tenantId", "nextExecutionAt");

-- AddForeignKey
ALTER TABLE "crm"."Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "crm"."Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."PartyRelationship" ADD CONSTRAINT "PartyRelationship_fromPartyId_fkey" FOREIGN KEY ("fromPartyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."PartyRelationship" ADD CONSTRAINT "PartyRelationship_toPartyId_fkey" FOREIGN KEY ("toPartyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."SequenceStep" ADD CONSTRAINT "SequenceStep_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "crm"."Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "crm"."Sequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm"."Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."SequenceEnrollment" ADD CONSTRAINT "SequenceEnrollment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE SET NULL ON UPDATE CASCADE;
