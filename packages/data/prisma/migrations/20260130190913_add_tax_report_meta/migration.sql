/*
  Warnings:

  - You are about to drop the column `ispublic` on the `File` table. All the data in the column will be lost.
  - You are about to drop the `cmscomment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cmspost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `cmsreader` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "CmsPostStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CmsCommentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SPAM', 'DELETED');

-- DropForeignKey
ALTER TABLE "cmscomment" DROP CONSTRAINT "cmscomment_parentid_fkey";

-- DropForeignKey
ALTER TABLE "cmscomment" DROP CONSTRAINT "cmscomment_postid_fkey";

-- DropForeignKey
ALTER TABLE "cmscomment" DROP CONSTRAINT "cmscomment_readerid_fkey";

-- DropForeignKey
ALTER TABLE "cmspost" DROP CONSTRAINT "cmspost_coverimagefileid_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "ispublic",
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TaxReport" ADD COLUMN     "meta" JSONB;

-- DropTable
DROP TABLE "cmscomment";

-- DropTable
DROP TABLE "cmspost";

-- DropTable
DROP TABLE "cmsreader";

-- DropEnum
DROP TYPE "cmscommentstatus";

-- DropEnum
DROP TYPE "cmspoststatus";

-- CreateTable
CREATE TABLE "CmsPost" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "CmsPostStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "coverImageFileId" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "contentText" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(6),
    "authorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "readerId" TEXT NOT NULL,
    "parentId" TEXT,
    "bodyText" TEXT NOT NULL,
    "status" "CmsCommentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsReader" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CmsReader_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_idx" ON "CmsPost"("tenantId");

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_workspaceId_idx" ON "CmsPost"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "CmsPost_tenantId_status_publishedAt_idx" ON "CmsPost"("tenantId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPost_tenantId_slug_key" ON "CmsPost"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_idx" ON "CmsComment"("tenantId");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_workspaceId_idx" ON "CmsComment"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_postId_idx" ON "CmsComment"("tenantId", "postId");

-- CreateIndex
CREATE INDEX "CmsComment_postId_status_idx" ON "CmsComment"("postId", "status");

-- CreateIndex
CREATE INDEX "CmsComment_tenantId_status_idx" ON "CmsComment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CmsReader_tenantId_idx" ON "CmsReader"("tenantId");

-- CreateIndex
CREATE INDEX "CmsReader_tenantId_workspaceId_idx" ON "CmsReader"("tenantId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsReader_tenantId_email_key" ON "CmsReader"("tenantId", "email");

-- AddForeignKey
ALTER TABLE "CmsPost" ADD CONSTRAINT "CmsPost_coverImageFileId_fkey" FOREIGN KEY ("coverImageFileId") REFERENCES "File"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsComment" ADD CONSTRAINT "CmsComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CmsPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsComment" ADD CONSTRAINT "CmsComment_readerId_fkey" FOREIGN KEY ("readerId") REFERENCES "CmsReader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsComment" ADD CONSTRAINT "CmsComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CmsComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
