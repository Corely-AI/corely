-- Add PROCESSING lifecycle for lease-based claims
ALTER TYPE "workflow"."OutboxStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';

-- Lease + diagnostics fields for durable multi-worker claims
ALTER TABLE "workflow"."OutboxEvent"
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastError" TEXT;

-- Claim scan optimization for status/availability/lease recovery paths
CREATE INDEX IF NOT EXISTS "OutboxEvent_status_availableAt_lockedUntil_createdAt_idx"
  ON "workflow"."OutboxEvent"("status", "availableAt", "lockedUntil", "createdAt");
