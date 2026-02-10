-- Add missing WebsiteSite columns introduced in schema
ALTER TABLE "content"."WebsiteSite" ADD COLUMN "slug" TEXT;
ALTER TABLE "content"."WebsiteSite" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Backfill slug for existing rows with a stable, valid value
UPDATE "content"."WebsiteSite" SET "slug" = "id" WHERE "slug" IS NULL;

-- Enforce non-null slug after backfill
ALTER TABLE "content"."WebsiteSite" ALTER COLUMN "slug" SET NOT NULL;

-- Indices to match Prisma schema
CREATE UNIQUE INDEX "WebsiteSite_tenantId_slug_key" ON "content"."WebsiteSite"("tenantId", "slug");
CREATE INDEX "WebsiteSite_tenantId_isDefault_idx" ON "content"."WebsiteSite"("tenantId", "isDefault");
