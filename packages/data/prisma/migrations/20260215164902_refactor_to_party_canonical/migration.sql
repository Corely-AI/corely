/*
  Warnings:

  - You are about to drop the `CrmAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "crm"."CrmAccount";

-- CreateTable
CREATE TABLE "crm"."CrmAccountProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "accountType" "crm"."CrmAccountType" NOT NULL DEFAULT 'CUSTOMER',
    "status" "crm"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "industry" TEXT,
    "ownerUserId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrmAccountProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrmAccountProfile_partyId_key" ON "crm"."CrmAccountProfile"("partyId");

-- CreateIndex
CREATE INDEX "CrmAccountProfile_tenantId_idx" ON "crm"."CrmAccountProfile"("tenantId");

-- CreateIndex
CREATE INDEX "CrmAccountProfile_tenantId_status_idx" ON "crm"."CrmAccountProfile"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmAccountProfile_tenantId_accountType_idx" ON "crm"."CrmAccountProfile"("tenantId", "accountType");

-- CreateIndex
CREATE INDEX "CrmAccountProfile_tenantId_ownerUserId_idx" ON "crm"."CrmAccountProfile"("tenantId", "ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAccountProfile_tenantId_partyId_key" ON "crm"."CrmAccountProfile"("tenantId", "partyId");

-- AddForeignKey
ALTER TABLE "crm"."CrmAccountProfile" ADD CONSTRAINT "CrmAccountProfile_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "crm"."Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;
