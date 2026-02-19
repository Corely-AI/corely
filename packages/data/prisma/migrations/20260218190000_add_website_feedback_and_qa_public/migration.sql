-- CreateEnum
CREATE TYPE "content"."WebsiteQaScope" AS ENUM ('site', 'page');

-- CreateEnum
CREATE TYPE "content"."WebsiteQaStatus" AS ENUM ('draft', 'published');

-- CreateTable
CREATE TABLE "content"."WebsiteFeedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pageId" TEXT,
    "message" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "rating" INTEGER,
    "youtubeJson" JSONB NOT NULL,
    "metaJson" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsiteFeedbackImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WebsiteFeedbackImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content"."WebsiteQa" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "scope" "content"."WebsiteQaScope" NOT NULL,
    "pageId" TEXT,
    "status" "content"."WebsiteQaStatus" NOT NULL DEFAULT 'draft',
    "order" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "answerHtml" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "WebsiteQa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteFeedback_tenantId_siteId_createdAt_idx" ON "content"."WebsiteFeedback"("tenantId", "siteId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteFeedback_tenantId_pageId_createdAt_idx" ON "content"."WebsiteFeedback"("tenantId", "pageId", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteFeedbackImage_tenantId_feedbackId_idx" ON "content"."WebsiteFeedbackImage"("tenantId", "feedbackId");

-- CreateIndex
CREATE INDEX "WebsiteFeedbackImage_tenantId_fileId_idx" ON "content"."WebsiteFeedbackImage"("tenantId", "fileId");

-- CreateIndex
CREATE INDEX "WebsiteQa_tenantId_siteId_locale_status_order_idx" ON "content"."WebsiteQa"("tenantId", "siteId", "locale", "status", "order");

-- CreateIndex
CREATE INDEX "WebsiteQa_tenantId_siteId_pageId_locale_status_order_idx" ON "content"."WebsiteQa"("tenantId", "siteId", "pageId", "locale", "status", "order");

-- AddForeignKey
ALTER TABLE "content"."WebsiteFeedback" ADD CONSTRAINT "WebsiteFeedback_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteFeedback" ADD CONSTRAINT "WebsiteFeedback_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "content"."WebsitePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteFeedbackImage" ADD CONSTRAINT "WebsiteFeedbackImage_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "content"."WebsiteFeedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteQa" ADD CONSTRAINT "WebsiteQa_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "content"."WebsiteSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content"."WebsiteQa" ADD CONSTRAINT "WebsiteQa_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "content"."WebsitePage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
