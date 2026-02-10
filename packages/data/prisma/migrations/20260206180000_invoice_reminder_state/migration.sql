-- CreateTable
CREATE TABLE "billing"."InvoiceReminderState" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "remindersSent" INTEGER NOT NULL DEFAULT 0,
    "nextReminderAt" TIMESTAMPTZ(6),
    "lastReminderAt" TIMESTAMPTZ(6),
    "lockedAt" TIMESTAMPTZ(6),
    "lockedBy" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InvoiceReminderState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceReminderState_tenantId_invoiceId_key" ON "billing"."InvoiceReminderState"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceReminderState_tenantId_workspaceId_nextReminderAt_idx" ON "billing"."InvoiceReminderState"("tenantId", "workspaceId", "nextReminderAt");

-- CreateIndex
CREATE INDEX "InvoiceReminderState_tenantId_lockedAt_idx" ON "billing"."InvoiceReminderState"("tenantId", "lockedAt");

-- AddForeignKey
ALTER TABLE "billing"."InvoiceReminderState" ADD CONSTRAINT "InvoiceReminderState_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "billing"."Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
