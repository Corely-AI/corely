-- CreateEnum
CREATE TYPE "identity"."RoleScope" AS ENUM ('HOST', 'TENANT');

-- AlterTable
ALTER TABLE "identity"."Membership" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "identity"."Role" ADD COLUMN     "scope" "identity"."RoleScope" NOT NULL DEFAULT 'TENANT',
ALTER COLUMN "tenantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "identity"."RolePermissionGrant" ALTER COLUMN "tenantId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "platform"."TenantFeatureOverride" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "feature_key" TEXT NOT NULL,
    "value_json" TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "TenantFeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TenantFeatureOverride_tenant_id_idx" ON "platform"."TenantFeatureOverride"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TenantFeatureOverride_tenant_id_feature_key_key" ON "platform"."TenantFeatureOverride"("tenant_id", "feature_key");

-- AddForeignKey
ALTER TABLE "platform"."TenantFeatureOverride" ADD CONSTRAINT "TenantFeatureOverride_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
