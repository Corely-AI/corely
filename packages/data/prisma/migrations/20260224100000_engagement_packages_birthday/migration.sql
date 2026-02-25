-- AlterTable
ALTER TABLE "crm"."Party"
ADD COLUMN "birthday" DATE;

-- AlterTable
ALTER TABLE "crm"."LoyaltyAccount"
ADD COLUMN "lifetimeEarnedPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tier" TEXT;

-- CreateEnum
CREATE TYPE "crm"."CustomerPackageStatus" AS ENUM ('ACTIVE', 'CANCELED', 'EXPIRED', 'DEPLETED');

-- CreateTable
CREATE TABLE "crm"."CustomerPackage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerPartyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "crm"."CustomerPackageStatus" NOT NULL DEFAULT 'ACTIVE',
  "totalUnits" INTEGER NOT NULL,
  "remainingUnits" INTEGER NOT NULL,
  "expiresOn" DATE,
  "notes" TEXT,
  "createdByEmployeePartyId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "CustomerPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."PackageUsage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "customerPackageId" TEXT NOT NULL,
  "customerPartyId" TEXT NOT NULL,
  "unitsUsed" INTEGER NOT NULL,
  "usedAt" TIMESTAMPTZ(6) NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "notes" TEXT,
  "createdByEmployeePartyId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PackageUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Party_tenantId_birthday_idx" ON "crm"."Party"("tenantId", "birthday");

-- CreateIndex
CREATE INDEX "CustomerPackage_tenantId_customerPartyId_status_idx" ON "crm"."CustomerPackage"("tenantId", "customerPartyId", "status");

-- CreateIndex
CREATE INDEX "CustomerPackage_tenantId_expiresOn_idx" ON "crm"."CustomerPackage"("tenantId", "expiresOn");

-- CreateIndex
CREATE UNIQUE INDEX "PackageUsage_tenantId_sourceType_sourceId_key" ON "crm"."PackageUsage"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PackageUsage_tenantId_customerPackageId_usedAt_idx" ON "crm"."PackageUsage"("tenantId", "customerPackageId", "usedAt");

-- CreateIndex
CREATE INDEX "PackageUsage_tenantId_customerPartyId_usedAt_idx" ON "crm"."PackageUsage"("tenantId", "customerPartyId", "usedAt");

-- AddForeignKey
ALTER TABLE "crm"."PackageUsage"
ADD CONSTRAINT "PackageUsage_customerPackageId_fkey"
FOREIGN KEY ("customerPackageId") REFERENCES "crm"."CustomerPackage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
