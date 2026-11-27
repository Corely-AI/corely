ALTER TABLE "commerce"."VendorBill"
  ADD COLUMN "workspaceId" TEXT,
  ADD COLUMN "sourceFilename" TEXT,
  ALTER COLUMN "supplierPartyId" DROP NOT NULL,
  ALTER COLUMN "billDate" DROP NOT NULL,
  ALTER COLUMN "dueDate" DROP NOT NULL,
  ALTER COLUMN "currency" DROP NOT NULL;

CREATE INDEX "VendorBill_tenantId_workspaceId_createdAt_idx"
  ON "commerce"."VendorBill"("tenantId", "workspaceId", "createdAt");
