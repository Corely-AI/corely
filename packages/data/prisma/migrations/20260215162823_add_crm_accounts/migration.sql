-- CreateEnum
CREATE TYPE "crm"."AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECT');

-- CreateEnum
CREATE TYPE "crm"."CrmAccountType" AS ENUM ('CUSTOMER', 'VENDOR', 'PARTNER', 'OTHER');

-- CreateTable
CREATE TABLE "crm"."CrmAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "crm"."CrmAccountType" NOT NULL DEFAULT 'CUSTOMER',
    "status" "crm"."AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "industry" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "notes" TEXT,
    "ownerUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrmAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmAccount_tenantId_idx" ON "crm"."CrmAccount"("tenantId");

-- CreateIndex
CREATE INDEX "CrmAccount_tenantId_status_idx" ON "crm"."CrmAccount"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CrmAccount_tenantId_accountType_idx" ON "crm"."CrmAccount"("tenantId", "accountType");

-- CreateIndex
CREATE INDEX "CrmAccount_tenantId_ownerUserId_idx" ON "crm"."CrmAccount"("tenantId", "ownerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAccount_id_tenantId_key" ON "crm"."CrmAccount"("id", "tenantId");
