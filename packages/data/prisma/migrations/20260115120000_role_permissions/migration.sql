ALTER TABLE "Role"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE "Role" SET "isSystem" = TRUE WHERE "systemKey" IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PermissionEffect') THEN
    CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');
  END IF;
END $$;

CREATE TABLE "RolePermissionGrant" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "permissionKey" TEXT NOT NULL,
  "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy" TEXT,
  CONSTRAINT "RolePermissionGrant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RolePermissionGrant"
  ADD CONSTRAINT "RolePermissionGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermissionGrant"
  ADD CONSTRAINT "RolePermissionGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RolePermissionGrant"
  ADD CONSTRAINT "RolePermissionGrant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "RolePermissionGrant_tenantId_roleId_permissionKey_key" ON "RolePermissionGrant"("tenantId", "roleId", "permissionKey");
CREATE INDEX "RolePermissionGrant_tenantId_roleId_idx" ON "RolePermissionGrant"("tenantId", "roleId");
CREATE INDEX "RolePermissionGrant_permissionKey_idx" ON "RolePermissionGrant"("permissionKey");
