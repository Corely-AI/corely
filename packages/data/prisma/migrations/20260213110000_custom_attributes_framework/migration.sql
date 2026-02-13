-- Add SOCIAL contact point support
DO $$
BEGIN
  BEGIN
    ALTER TYPE "crm"."ContactPointType" ADD VALUE IF NOT EXISTS 'SOCIAL';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE "crm"."ContactPoint"
  ADD COLUMN IF NOT EXISTS "platform" TEXT,
  ADD COLUMN IF NOT EXISTS "label" TEXT;

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = to_regclass('crm."ContactPoint"')
      AND contype = 'u'
      AND conname IN ('tenantId_partyId_type', 'ContactPoint_tenantId_partyId_type_key')
  LOOP
    EXECUTE format('ALTER TABLE "crm"."ContactPoint" DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = to_regclass('crm."ContactPoint"')
      AND contype = 'u'
      AND conname = 'tenantId_partyId_type_value'
  ) THEN
    ALTER TABLE "crm"."ContactPoint"
      ADD CONSTRAINT "tenantId_partyId_type_value" UNIQUE ("tenantId", "partyId", "type", "value");
  END IF;
END $$;

DROP INDEX IF EXISTS "crm"."ContactPoint_tenantId_partyId_type_idx";
CREATE INDEX IF NOT EXISTS "ContactPoint_tenantId_partyId_type_isPrimary_idx"
  ON "crm"."ContactPoint" ("tenantId", "partyId", "type", "isPrimary");

-- Dimension framework tables
CREATE TABLE IF NOT EXISTS "platform"."DimensionType" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "appliesTo" TEXT[] NOT NULL,
  "requiredFor" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowMultiple" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DimensionType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform"."DimensionValue" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DimensionValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "platform"."EntityDimension" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "typeId" TEXT NOT NULL,
  "valueId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EntityDimension_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DimensionType_tenantId_code_key"
  ON "platform"."DimensionType" ("tenantId", "code");
CREATE INDEX IF NOT EXISTS "DimensionType_tenantId_isActive_sortOrder_idx"
  ON "platform"."DimensionType" ("tenantId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "DimensionValue_tenantId_typeId_code_key"
  ON "platform"."DimensionValue" ("tenantId", "typeId", "code");
CREATE INDEX IF NOT EXISTS "DimensionValue_tenantId_typeId_isActive_sortOrder_idx"
  ON "platform"."DimensionValue" ("tenantId", "typeId", "isActive", "sortOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "EntityDimension_tenantId_entityType_entityId_typeId_valueId_key"
  ON "platform"."EntityDimension" ("tenantId", "entityType", "entityId", "typeId", "valueId");
CREATE INDEX IF NOT EXISTS "EntityDimension_tenantId_entityType_entityId_idx"
  ON "platform"."EntityDimension" ("tenantId", "entityType", "entityId");
CREATE INDEX IF NOT EXISTS "EntityDimension_tenantId_entityType_typeId_valueId_idx"
  ON "platform"."EntityDimension" ("tenantId", "entityType", "typeId", "valueId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DimensionValue_typeId_fkey'
  ) THEN
    ALTER TABLE "platform"."DimensionValue"
      ADD CONSTRAINT "DimensionValue_typeId_fkey"
      FOREIGN KEY ("typeId") REFERENCES "platform"."DimensionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EntityDimension_typeId_fkey'
  ) THEN
    ALTER TABLE "platform"."EntityDimension"
      ADD CONSTRAINT "EntityDimension_typeId_fkey"
      FOREIGN KEY ("typeId") REFERENCES "platform"."DimensionType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'EntityDimension_valueId_fkey'
  ) THEN
    ALTER TABLE "platform"."EntityDimension"
      ADD CONSTRAINT "EntityDimension_valueId_fkey"
      FOREIGN KEY ("valueId") REFERENCES "platform"."DimensionValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
