-- CreateEnum
CREATE TYPE "commerce"."InventoryLotStatus" AS ENUM ('AVAILABLE', 'QUARANTINE', 'BLOCKED', 'DISPOSED');

-- AlterTable
ALTER TABLE "billing"."InvoiceReminderState" ADD CONSTRAINT "InvoiceReminderState_invoiceId_key" UNIQUE ("invoiceId");

-- CreateTable
CREATE TABLE "commerce"."InventoryLot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "mfgDate" DATE,
    "expiryDate" DATE,
    "receivedDate" DATE NOT NULL,
    "shipmentId" TEXT,
    "supplierPartyId" TEXT,
    "unitCostCents" INTEGER,
    "qtyReceived" INTEGER NOT NULL,
    "qtyOnHand" INTEGER NOT NULL,
    "qtyReserved" INTEGER NOT NULL DEFAULT 0,
    "status" "commerce"."InventoryLotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "metadataJson" JSONB,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "commerce"."InventoryDocumentLine" ADD COLUMN "lotId" TEXT,
ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "mfgDate" DATE,
ADD COLUMN "expiryDate" DATE;

-- AlterTable
ALTER TABLE "commerce"."StockMove" ADD COLUMN "lotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "InventoryLot_tenantId_productId_lotNumber_key" ON "commerce"."InventoryLot"("tenantId", "productId", "lotNumber");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_productId_expiryDate_idx" ON "commerce"."InventoryLot"("tenantId", "productId", "expiryDate");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_expiryDate_idx" ON "commerce"."InventoryLot"("tenantId", "expiryDate");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_status_idx" ON "commerce"."InventoryLot"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryLot_tenantId_shipmentId_idx" ON "commerce"."InventoryLot"("tenantId", "shipmentId");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_lotId_idx" ON "commerce"."InventoryDocumentLine"("lotId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_lotId_idx" ON "commerce"."StockMove"("tenantId", "lotId");
