-- Add optional correlationId column for tracing outbox events
ALTER TABLE "OutboxEvent"
ADD COLUMN IF NOT EXISTS "correlationId" TEXT;
