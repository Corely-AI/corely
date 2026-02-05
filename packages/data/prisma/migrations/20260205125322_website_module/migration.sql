-- CreateEnum
CREATE TYPE "content"."WebsitePageStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "content"."WebsiteSite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultLocale" TEXT NOT NULL,
    "brandingJson" JSONB,
    "themeJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsiteSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsiteDomain" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsitePage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "content"."WebsitePageStatus" NOT NULL DEFAULT 'DRAFT',
    "cmsEntryId" TEXT NOT NULL,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImageFileId" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsiteMenu" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsiteMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsitePageSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsitePageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteSite_tenantId_idx" ON "content"."WebsiteSite"("tenantId");

-- CreateIndex
CREATE INDEX "WebsiteDomain_tenantId_idx" ON "content"."WebsiteDomain"("tenantId");

-- CreateIndex
CREATE INDEX "WebsiteDomain_tenantId_siteId_idx" ON "content"."WebsiteDomain"("tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteDomain_tenantId_hostname_key" ON "content"."WebsiteDomain"("tenantId", "hostname");

-- CreateIndex
CREATE INDEX "WebsitePage_tenantId_idx" ON "content"."WebsitePage"("tenantId");

-- CreateIndex
CREATE INDEX "WebsitePage_tenantId_siteId_idx" ON "content"."WebsitePage"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "WebsitePage_tenantId_siteId_status_idx" ON "content"."WebsitePage"("tenantId", "siteId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePage_tenantId_siteId_path_locale_key" ON "content"."WebsitePage"("tenantId", "siteId", "path", "locale");

-- CreateIndex
CREATE INDEX "WebsiteMenu_tenantId_idx" ON "content"."WebsiteMenu"("tenantId");

-- CreateIndex
CREATE INDEX "WebsiteMenu_tenantId_siteId_idx" ON "content"."WebsiteMenu"("tenantId", "siteId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteMenu_tenantId_siteId_name_locale_key" ON "content"."WebsiteMenu"("tenantId", "siteId", "name", "locale");

-- CreateIndex
CREATE INDEX "WebsitePageSnapshot_tenantId_idx" ON "content"."WebsitePageSnapshot"("tenantId");

-- CreateIndex
CREATE INDEX "WebsitePageSnapshot_tenantId_siteId_idx" ON "content"."WebsitePageSnapshot"("tenantId", "siteId");

-- CreateIndex
CREATE INDEX "WebsitePageSnapshot_pageId_version_idx" ON "content"."WebsitePageSnapshot"("pageId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePageSnapshot_tenantId_pageId_version_key" ON "content"."WebsitePageSnapshot"("tenantId", "pageId", "version");

-- AddForeignKey
ALTER TABLE "content"."WebsiteDomain" ADD CONSTRAINT "WebsiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsitePage" ADD CONSTRAINT "WebsitePage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteMenu" ADD CONSTRAINT "WebsiteMenu_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsitePageSnapshot" ADD CONSTRAINT "WebsitePageSnapshot_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "content"."WebsitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsitePageSnapshot" ADD CONSTRAINT "WebsitePageSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
