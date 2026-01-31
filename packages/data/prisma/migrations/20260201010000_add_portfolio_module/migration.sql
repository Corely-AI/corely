-- CreateEnum
CREATE TYPE "PortfolioShowcaseType" AS ENUM ('individual', 'company', 'hybrid');

-- CreateEnum
CREATE TYPE "PortfolioProjectType" AS ENUM ('open_source', 'side_hustle', 'startup', 'agency', 'other');

-- CreateEnum
CREATE TYPE "PortfolioClientType" AS ENUM ('cto', 'freelancer', 'partner', 'employer', 'other');

-- CreateEnum
CREATE TYPE "PortfolioContentStatus" AS ENUM ('draft', 'published', 'archived');

-- AlterTable
ALTER TABLE "CmsPost" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PortfolioShowcase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" "PortfolioShowcaseType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primaryDomain" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioShowcase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "introLine" TEXT,
    "headline" TEXT,
    "subheadline" TEXT,
    "aboutShort" TEXT,
    "aboutLong" TEXT,
    "focusBullets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ctaTitle" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "techStacks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "socialLinks" JSONB,
    "homeSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "PortfolioProjectType" NOT NULL,
    "status" "PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "coverImageUrl" TEXT,
    "links" JSONB,
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioClient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clientType" "PortfolioClientType" NOT NULL,
    "locationText" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoImageUrl" TEXT,
    "summary" TEXT,
    "testimonialQuote" TEXT,
    "testimonialAuthor" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProjectClient" (
    "projectId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,

    CONSTRAINT "PortfolioProjectClient_pkey" PRIMARY KEY ("projectId","clientId")
);

-- CreateTable
CREATE TABLE "PortfolioService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "deliverables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startingFromPrice" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "status" "PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioTeamMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "showcaseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "photoUrl" TEXT,
    "socialLinks" JSONB,
    "status" "PortfolioContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortfolioTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_idx" ON "PortfolioShowcase"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioShowcase_tenantId_workspaceId_isPublished_idx" ON "PortfolioShowcase"("tenantId", "workspaceId", "isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioShowcase_tenantId_workspaceId_slug_key" ON "PortfolioShowcase"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProfile_showcaseId_key" ON "PortfolioProfile"("showcaseId");

-- CreateIndex
CREATE INDEX "PortfolioProfile_tenantId_workspaceId_idx" ON "PortfolioProfile"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioProject_tenantId_workspaceId_idx" ON "PortfolioProject"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioProject_showcaseId_status_idx" ON "PortfolioProject"("showcaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_showcaseId_slug_key" ON "PortfolioProject"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioClient_tenantId_workspaceId_idx" ON "PortfolioClient"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioClient_showcaseId_featured_idx" ON "PortfolioClient"("showcaseId", "featured");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioClient_showcaseId_slug_key" ON "PortfolioClient"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioProjectClient_tenantId_workspaceId_idx" ON "PortfolioProjectClient"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioService_tenantId_workspaceId_idx" ON "PortfolioService"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioService_showcaseId_status_idx" ON "PortfolioService"("showcaseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioService_showcaseId_slug_key" ON "PortfolioService"("showcaseId", "slug");

-- CreateIndex
CREATE INDEX "PortfolioTeamMember_tenantId_workspaceId_idx" ON "PortfolioTeamMember"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "PortfolioTeamMember_showcaseId_status_idx" ON "PortfolioTeamMember"("showcaseId", "status");

-- AddForeignKey
ALTER TABLE "PortfolioProfile" ADD CONSTRAINT "PortfolioProfile_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProject" ADD CONSTRAINT "PortfolioProject_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioClient" ADD CONSTRAINT "PortfolioClient_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProjectClient" ADD CONSTRAINT "PortfolioProjectClient_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PortfolioProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProjectClient" ADD CONSTRAINT "PortfolioProjectClient_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "PortfolioClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioService" ADD CONSTRAINT "PortfolioService_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioTeamMember" ADD CONSTRAINT "PortfolioTeamMember_showcaseId_fkey" FOREIGN KEY ("showcaseId") REFERENCES "PortfolioShowcase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
