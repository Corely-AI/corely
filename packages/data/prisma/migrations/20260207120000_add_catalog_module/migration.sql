-- CreateEnum
CREATE TYPE "commerce"."CatalogItemStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "commerce"."CatalogItemType" AS ENUM ('PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "commerce"."CatalogVariantStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "commerce"."CatalogTaxExciseType" AS ENUM ('PERCENT', 'AMOUNT');

-- CreateEnum
CREATE TYPE "commerce"."CatalogPriceListStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "commerce"."CatalogUom" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseCode" TEXT,
    "factor" DECIMAL(19,6),
    "rounding" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CatalogUom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogTaxProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vatRateBps" INTEGER NOT NULL DEFAULT 0,
    "isExciseApplicable" BOOLEAN NOT NULL DEFAULT false,
    "exciseType" "commerce"."CatalogTaxExciseType",
    "exciseValue" DECIMAL(19,6),
    "effectiveFrom" TIMESTAMPTZ(6),
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CatalogTaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogCategory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "commerce"."CatalogItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "type" "commerce"."CatalogItemType" NOT NULL,
    "defaultUomId" TEXT NOT NULL,
    "taxProfileId" TEXT,
    "shelfLifeDays" INTEGER,
    "requiresLotTracking" BOOLEAN NOT NULL DEFAULT false,
    "requiresExpiryDate" BOOLEAN NOT NULL DEFAULT false,
    "hsCode" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogItemCategory" (
    "itemId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "CatalogItemCategory_pkey" PRIMARY KEY ("itemId","categoryId")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogVariant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT,
    "attributes" JSONB,
    "status" "commerce"."CatalogVariantStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CatalogVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogVariantBarcode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogVariantBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogPriceList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "commerce"."CatalogPriceListStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "CatalogPriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."CatalogPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "itemId" TEXT,
    "variantId" TEXT,
    "amount" DECIMAL(19,4) NOT NULL,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMPTZ(6),
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CatalogPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CatalogUom_tenantId_workspaceId_code_key" ON "commerce"."CatalogUom"("tenantId", "workspaceId", "code");

-- CreateIndex
CREATE INDEX "CatalogUom_tenantId_workspaceId_name_idx" ON "commerce"."CatalogUom"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogTaxProfile_tenantId_workspaceId_name_key" ON "commerce"."CatalogTaxProfile"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "CatalogTaxProfile_tenantId_workspaceId_archivedAt_idx" ON "commerce"."CatalogTaxProfile"("tenantId", "workspaceId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_tenantId_workspaceId_name_key" ON "commerce"."CatalogCategory"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "CatalogCategory_tenantId_workspaceId_parentId_idx" ON "commerce"."CatalogCategory"("tenantId", "workspaceId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_tenantId_workspaceId_code_key" ON "commerce"."CatalogItem"("tenantId", "workspaceId", "code");

-- CreateIndex
CREATE INDEX "CatalogItem_tenantId_workspaceId_status_type_idx" ON "commerce"."CatalogItem"("tenantId", "workspaceId", "status", "type");

-- CreateIndex
CREATE INDEX "CatalogItem_tenantId_workspaceId_name_idx" ON "commerce"."CatalogItem"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "CatalogItem_tenantId_workspaceId_archivedAt_idx" ON "commerce"."CatalogItem"("tenantId", "workspaceId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogVariant_tenantId_workspaceId_sku_key" ON "commerce"."CatalogVariant"("tenantId", "workspaceId", "sku");

-- CreateIndex
CREATE INDEX "CatalogVariant_tenantId_workspaceId_itemId_idx" ON "commerce"."CatalogVariant"("tenantId", "workspaceId", "itemId");

-- CreateIndex
CREATE INDEX "CatalogVariant_tenantId_workspaceId_archivedAt_idx" ON "commerce"."CatalogVariant"("tenantId", "workspaceId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogVariantBarcode_tenantId_workspaceId_barcode_key" ON "commerce"."CatalogVariantBarcode"("tenantId", "workspaceId", "barcode");

-- CreateIndex
CREATE INDEX "CatalogVariantBarcode_tenantId_workspaceId_variantId_idx" ON "commerce"."CatalogVariantBarcode"("tenantId", "workspaceId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogPriceList_tenantId_workspaceId_name_key" ON "commerce"."CatalogPriceList"("tenantId", "workspaceId", "name");

-- CreateIndex
CREATE INDEX "CatalogPriceList_tenantId_workspaceId_status_idx" ON "commerce"."CatalogPriceList"("tenantId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "CatalogPrice_tenantId_workspaceId_priceListId_idx" ON "commerce"."CatalogPrice"("tenantId", "workspaceId", "priceListId");

-- CreateIndex
CREATE INDEX "CatalogPrice_tenantId_workspaceId_itemId_idx" ON "commerce"."CatalogPrice"("tenantId", "workspaceId", "itemId");

-- CreateIndex
CREATE INDEX "CatalogPrice_tenantId_workspaceId_variantId_idx" ON "commerce"."CatalogPrice"("tenantId", "workspaceId", "variantId");

-- AddForeignKey
ALTER TABLE "commerce"."CatalogCategory" ADD CONSTRAINT "CatalogCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "commerce"."CatalogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogItem" ADD CONSTRAINT "CatalogItem_defaultUomId_fkey" FOREIGN KEY ("defaultUomId") REFERENCES "commerce"."CatalogUom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogItem" ADD CONSTRAINT "CatalogItem_taxProfileId_fkey" FOREIGN KEY ("taxProfileId") REFERENCES "commerce"."CatalogTaxProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogItemCategory" ADD CONSTRAINT "CatalogItemCategory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "commerce"."CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogItemCategory" ADD CONSTRAINT "CatalogItemCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "commerce"."CatalogCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogVariant" ADD CONSTRAINT "CatalogVariant_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "commerce"."CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogVariantBarcode" ADD CONSTRAINT "CatalogVariantBarcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "commerce"."CatalogVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogPriceList" ADD CONSTRAINT "CatalogPriceList_currency_check" CHECK (char_length("currency") = 3);

-- AddForeignKey
ALTER TABLE "commerce"."CatalogPrice" ADD CONSTRAINT "CatalogPrice_priceListId_fkey" FOREIGN KEY ("priceListId") REFERENCES "commerce"."CatalogPriceList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogPrice" ADD CONSTRAINT "CatalogPrice_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "commerce"."CatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogPrice" ADD CONSTRAINT "CatalogPrice_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "commerce"."CatalogVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."CatalogPrice" ADD CONSTRAINT "CatalogPrice_item_or_variant_check" CHECK (
  ("itemId" IS NOT NULL) OR ("variantId" IS NOT NULL)
);
