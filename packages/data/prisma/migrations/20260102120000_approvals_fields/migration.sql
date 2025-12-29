CREATE TYPE "WorkflowDefinitionType" AS ENUM ('GENERAL', 'APPROVAL');

ALTER TABLE "WorkflowDefinition" ADD COLUMN "type" "WorkflowDefinitionType" NOT NULL DEFAULT 'GENERAL';

ALTER TABLE "Task"
  ADD COLUMN "dueAt" TIMESTAMPTZ,
  ADD COLUMN "assigneeUserId" TEXT,
  ADD COLUMN "assigneeRoleId" TEXT,
  ADD COLUMN "assigneePermissionKey" TEXT;

CREATE INDEX IF NOT EXISTS "Task_tenantId_assigneeUserId_status_idx" ON "Task" ("tenantId", "assigneeUserId", "status");
CREATE INDEX IF NOT EXISTS "Task_tenantId_assigneeRoleId_status_idx" ON "Task" ("tenantId", "assigneeRoleId", "status");
CREATE INDEX IF NOT EXISTS "Task_tenantId_assigneePermissionKey_status_idx" ON "Task" ("tenantId", "assigneePermissionKey", "status");
