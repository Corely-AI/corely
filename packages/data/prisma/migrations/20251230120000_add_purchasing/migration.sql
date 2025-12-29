-- Update SourceType enum
ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'VendorBill';
ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'BillPayment';

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'SENT',
  'PARTIALLY_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'CANCELED'
);

-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'POSTED',
  'PARTIALLY_PAID',
  'PAID',
  'VOID'
);

-- CreateEnum
CREATE TYPE "BillPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "PurchaseOrder" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "poNumber" TEXT,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "supplierPartyId" TEXT NOT NULL,
  "supplierContactPartyId" TEXT,
  "orderDate" DATE,
  "expectedDeliveryDate" DATE,
  "currency" TEXT NOT NULL,
  "notes" TEXT,
  "subtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "approvedAt" TIMESTAMPTZ(6),
  "sentAt" TIMESTAMPTZ(6),
  "receivedAt" TIMESTAMPTZ(6),
  "closedAt" TIMESTAMPTZ(6),
  "canceledAt" TIMESTAMPTZ(6),
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCostCents" INTEGER NOT NULL,
  "taxCode" TEXT,
  "category" TEXT,
  "sortOrder" INTEGER,

  CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "billNumber" TEXT,
  "internalBillRef" TEXT,
  "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
  "supplierPartyId" TEXT NOT NULL,
  "supplierContactPartyId" TEXT,
  "billDate" DATE NOT NULL,
  "dueDate" DATE NOT NULL,
  "currency" TEXT NOT NULL,
  "paymentTerms" TEXT,
  "notes" TEXT,
  "subtotalCents" INTEGER NOT NULL,
  "taxCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "paidCents" INTEGER NOT NULL,
  "dueCents" INTEGER NOT NULL,
  "approvedAt" TIMESTAMPTZ(6),
  "postedAt" TIMESTAMPTZ(6),
  "voidedAt" TIMESTAMPTZ(6),
  "purchaseOrderId" TEXT,
  "postedJournalEntryId" TEXT,
  "possibleDuplicateOfBillId" TEXT,
  "duplicateScore" DOUBLE PRECISION,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillLine" (
  "id" TEXT NOT NULL,
  "vendorBillId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCostCents" INTEGER NOT NULL,
  "category" TEXT,
  "glAccountId" TEXT,
  "taxCode" TEXT,
  "sortOrder" INTEGER,

  CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "vendorBillId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "paymentDate" DATE NOT NULL,
  "method" "BillPaymentMethod" NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedByUserId" TEXT,
  "journalEntryId" TEXT,

  CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasingSettings" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "defaultPaymentTerms" TEXT,
  "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
  "poNumberingPrefix" TEXT NOT NULL DEFAULT 'PO-',
  "poNextNumber" INTEGER NOT NULL DEFAULT 1,
  "billInternalRefPrefix" TEXT DEFAULT 'BILL-',
  "billNextNumber" INTEGER DEFAULT 1,
  "defaultAccountsPayableAccountId" TEXT,
  "defaultExpenseAccountId" TEXT,
  "defaultBankAccountId" TEXT,
  "autoPostOnBillPost" BOOLEAN NOT NULL DEFAULT true,
  "autoPostOnPaymentRecord" BOOLEAN NOT NULL DEFAULT true,
  "billDuplicateDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
  "approvalRequiredForBills" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "PurchasingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasingAccountMapping" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "supplierPartyId" TEXT NOT NULL,
  "categoryKey" TEXT NOT NULL,
  "glAccountId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "PurchasingAccountMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_supplierPartyId_idx" ON "PurchaseOrder"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_createdAt_idx" ON "PurchaseOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_status_idx" ON "VendorBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_supplierPartyId_idx" ON "VendorBill"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_createdAt_idx" ON "VendorBill"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_tenantId_supplierPartyId_billNumber_key" ON "VendorBill"("tenantId", "supplierPartyId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_vendorBillId_idx" ON "VendorBillLine"("vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_tenantId_vendorBillId_idx" ON "BillPayment"("tenantId", "vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_vendorBillId_idx" ON "BillPayment"("vendorBillId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingSettings_tenantId_key" ON "PurchasingSettings"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_categoryKey_key" ON "PurchasingAccountMapping"("tenantId", "supplierPartyId", "categoryKey");

-- CreateIndex
CREATE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_idx" ON "PurchasingAccountMapping"("tenantId", "supplierPartyId");

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
