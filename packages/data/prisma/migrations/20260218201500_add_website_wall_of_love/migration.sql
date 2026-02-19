-- CreateEnum
CREATE TYPE "content"."WebsiteWallOfLoveItemType" AS ENUM ('image', 'youtube', 'x');

-- CreateEnum
CREATE TYPE "content"."WebsiteWallOfLoveStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "content"."WebsiteWallOfLoveItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "content"."WebsiteWallOfLoveItemType" NOT NULL,
    "status" "content"."WebsiteWallOfLoveStatus" NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL,
    "quote" TEXT,
    "authorName" TEXT,
    "authorTitle" TEXT,
    "sourceLabel" TEXT,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsiteWallOfLoveItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsiteWallOfLoveItemImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebsiteWallOfLoveItemImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteWallOfLoveItem_tenantId_siteId_status_order_idx" ON "content"."WebsiteWallOfLoveItem"("tenantId", "siteId", "status", "order");

-- CreateIndex
CREATE INDEX "WebsiteWallOfLoveItem_tenantId_siteId_order_idx" ON "content"."WebsiteWallOfLoveItem"("tenantId", "siteId", "order");

-- CreateIndex
CREATE INDEX "WebsiteWallOfLoveItemImage_tenantId_itemId_order_idx" ON "content"."WebsiteWallOfLoveItemImage"("tenantId", "itemId", "order");

-- CreateIndex
CREATE INDEX "WebsiteWallOfLoveItemImage_tenantId_fileId_idx" ON "content"."WebsiteWallOfLoveItemImage"("tenantId", "fileId");

-- AddForeignKey
ALTER TABLE "content"."WebsiteWallOfLoveItem" ADD CONSTRAINT "WebsiteWallOfLoveItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteWallOfLoveItemImage" ADD CONSTRAINT "WebsiteWallOfLoveItemImage_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "content"."WebsiteWallOfLoveItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
