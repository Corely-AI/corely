-- CreateEnum
CREATE TYPE "commerce"."ImportShipmentStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'CLEARED', 'RECEIVED', 'CANCELED');

-- CreateEnum
CREATE TYPE "commerce"."ImportDocumentType" AS ENUM ('BILL_OF_LADING', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'CERTIFICATE_OF_ORIGIN', 'IMPORT_LICENSE', 'CUSTOMS_DECLARATION', 'INSPECTION_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "commerce"."ShippingMode" AS ENUM ('SEA', 'AIR', 'LAND', 'COURIER');

-- CreateTable
CREATE TABLE "commerce"."ImportShipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentNumber" TEXT,
    "supplierPartyId" TEXT NOT NULL,
    "status" "commerce"."ImportShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "shippingMode" "commerce"."ShippingMode" NOT NULL DEFAULT 'SEA',
    "containerNumber" TEXT,
    "sealNumber" TEXT,
    "billOfLadingNumber" TEXT,
    "carrierName" TEXT,
    "vesselName" TEXT,
    "voyageNumber" TEXT,
    "originCountry" TEXT,
    "originPort" TEXT,
    "destinationCountry" TEXT,
    "destinationPort" TEXT,
    "finalWarehouseId" TEXT,
    "departureDate" DATE,
    "estimatedArrivalDate" DATE,
    "actualArrivalDate" DATE,
    "clearanceDate" DATE,
    "receivedDate" DATE,
    "customsDeclarationNumber" TEXT,
    "importLicenseNumber" TEXT,
    "hsCodesPrimary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incoterm" TEXT,
    "fobValueCents" INTEGER,
    "freightCostCents" INTEGER,
    "insuranceCostCents" INTEGER,
    "customsDutyCents" INTEGER,
    "customsTaxCents" INTEGER,
    "otherCostsCents" INTEGER,
    "totalLandedCostCents" INTEGER,
    "totalWeightKg" DOUBLE PRECISION,
    "totalVolumeM3" DOUBLE PRECISION,
    "totalPackages" INTEGER,
    "notes" TEXT,
    "metadataJson" JSONB,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "ImportShipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."ImportShipmentLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "hsCode" TEXT,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitFobCostCents" INTEGER,
    "lineFobCostCents" INTEGER,
    "allocatedFreightCents" INTEGER,
    "allocatedInsuranceCents" INTEGER,
    "allocatedDutyCents" INTEGER,
    "allocatedTaxCents" INTEGER,
    "allocatedOtherCents" INTEGER,
    "unitLandedCostCents" INTEGER,
    "weightKg" DOUBLE PRECISION,
    "volumeM3" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "ImportShipmentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."ImportShipmentDocument" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "documentType" "commerce"."ImportDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "documentName" TEXT NOT NULL,
    "documentUrl" TEXT,
    "fileStorageKey" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "uploadedByUserId" TEXT,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ImportShipmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."ImportSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "shipmentPrefix" TEXT NOT NULL DEFAULT 'IMP-',
    "shipmentNextNumber" INTEGER NOT NULL DEFAULT 1,
    "autoCreateLotsOnReceipt" BOOLEAN NOT NULL DEFAULT true,
    "requireBolForSubmit" BOOLEAN NOT NULL DEFAULT true,
    "requireInvoiceForSubmit" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ImportSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_status_idx" ON "commerce"."ImportShipment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_supplierPartyId_idx" ON "commerce"."ImportShipment"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_estimatedArrivalDate_idx" ON "commerce"."ImportShipment"("tenantId", "estimatedArrivalDate");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_actualArrivalDate_idx" ON "commerce"."ImportShipment"("tenantId", "actualArrivalDate");

-- CreateIndex
CREATE INDEX "ImportShipment_tenantId_createdAt_idx" ON "commerce"."ImportShipment"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ImportShipment_tenantId_shipmentNumber_key" ON "commerce"."ImportShipment"("tenantId", "shipmentNumber");

-- CreateIndex
CREATE INDEX "ImportShipmentLine_shipmentId_idx" ON "commerce"."ImportShipmentLine"("shipmentId");

-- CreateIndex
CREATE INDEX "ImportShipmentLine_productId_idx" ON "commerce"."ImportShipmentLine"("productId");

-- CreateIndex
CREATE INDEX "ImportShipmentDocument_shipmentId_idx" ON "commerce"."ImportShipmentDocument"("shipmentId");

-- CreateIndex
CREATE INDEX "ImportShipmentDocument_documentType_idx" ON "commerce"."ImportShipmentDocument"("documentType");

-- CreateIndex
CREATE UNIQUE INDEX "ImportSettings_tenantId_key" ON "commerce"."ImportSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "commerce"."ImportShipmentLine" ADD CONSTRAINT "ImportShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "commerce"."ImportShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."ImportShipmentDocument" ADD CONSTRAINT "ImportShipmentDocument_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "commerce"."ImportShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
