-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'BLOCKED');

-- CreateTable
CREATE TABLE "RentalProperty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'DRAFT',
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "descriptionHtml" TEXT,
    "maxGuests" INTEGER,
    "coverImageFileId" TEXT,
    "publishedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalPropertyCategory" (
    "propertyId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "RentalPropertyCategory_pkey" PRIMARY KEY ("propertyId","categoryId")
);

-- CreateTable
CREATE TABLE "RentalPropertyImage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalPropertyImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentalAvailabilityRange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "RentalAvailabilityRange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RentalProperty_tenantId_workspaceId_idx" ON "RentalProperty"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalProperty_tenantId_workspaceId_status_publishedAt_idx" ON "RentalProperty"("tenantId", "workspaceId", "status", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RentalProperty_tenantId_workspaceId_slug_key" ON "RentalProperty"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE INDEX "RentalCategory_tenantId_workspaceId_idx" ON "RentalCategory"("tenantId", "workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_slug_key" ON "RentalCategory"("tenantId", "workspaceId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RentalCategory_tenantId_workspaceId_name_key" ON "RentalCategory"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "RentalPropertyImage_tenantId_workspaceId_idx" ON "RentalPropertyImage"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalPropertyImage_propertyId_sortOrder_idx" ON "RentalPropertyImage"("propertyId", "sortOrder");

-- CreateIndex
CREATE INDEX "RentalAvailabilityRange_tenantId_workspaceId_idx" ON "RentalAvailabilityRange"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "RentalAvailabilityRange_propertyId_startDate_endDate_idx" ON "RentalAvailabilityRange"("propertyId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "RentalPropertyCategory" ADD CONSTRAINT "RentalPropertyCategory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalPropertyCategory" ADD CONSTRAINT "RentalPropertyCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RentalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalPropertyImage" ADD CONSTRAINT "RentalPropertyImage_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentalAvailabilityRange" ADD CONSTRAINT "RentalAvailabilityRange_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
