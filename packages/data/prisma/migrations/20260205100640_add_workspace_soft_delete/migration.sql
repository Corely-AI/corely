-- AlterTable
ALTER TABLE "platform"."Workspace" ADD COLUMN     "deletedAt" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "Workspace_deletedAt_idx" ON "platform"."Workspace"("deletedAt");
