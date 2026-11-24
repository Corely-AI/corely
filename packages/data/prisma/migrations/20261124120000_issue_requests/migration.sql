ALTER TABLE "crm"."Issue"
  ADD COLUMN "workspaceId" TEXT,
  ADD COLUMN "requestKind" TEXT,
  ADD COLUMN "clientEmail" TEXT,
  ADD COLUMN "clientUpdateStatus" TEXT,
  ADD COLUMN "clientUpdateSummary" TEXT,
  ADD COLUMN "clientUpdateQueuedAt" TIMESTAMPTZ(6);

CREATE INDEX "Issue_tenantId_workspaceId_reporterUserId_idx"
  ON "crm"."Issue" ("tenantId", "workspaceId", "reporterUserId");
