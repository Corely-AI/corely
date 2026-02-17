-- Create enums
CREATE TYPE "crm"."ActivityRecordSource" AS ENUM ('MANUAL', 'SYSTEM', 'INTEGRATION');
CREATE TYPE "crm"."CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "crm"."CommunicationLifecycleStatus" AS ENUM ('LOGGED', 'DRAFT', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');
CREATE TYPE "crm"."ChannelCategory" AS ENUM ('EMAIL', 'MESSAGING', 'SOCIAL', 'INTERNAL');

-- Replace ActivityType enum to remove EMAIL_DRAFT and add COMMUNICATION/SYSTEM_EVENT
ALTER TABLE "crm"."Activity" ALTER COLUMN "type" TYPE TEXT USING "type"::text;
UPDATE "crm"."Activity"
SET "type" = 'COMMUNICATION'
WHERE "type" = 'EMAIL_DRAFT';
DROP TYPE "crm"."ActivityType";
CREATE TYPE "crm"."ActivityType" AS ENUM ('NOTE', 'TASK', 'CALL', 'MEETING', 'COMMUNICATION', 'SYSTEM_EVENT');
ALTER TABLE "crm"."Activity"
ALTER COLUMN "type" TYPE "crm"."ActivityType"
USING "type"::"crm"."ActivityType";

-- Add communication columns to Activity
ALTER TABLE "crm"."Activity"
ADD COLUMN "direction" "crm"."CommunicationDirection",
ADD COLUMN "communicationStatus" "crm"."CommunicationLifecycleStatus",
ADD COLUMN "activityDate" TIMESTAMPTZ(6),
ADD COLUMN "ownerId" TEXT,
ADD COLUMN "recordSource" "crm"."ActivityRecordSource",
ADD COLUMN "recordSourceDetails" JSONB,
ADD COLUMN "toRecipients" JSONB,
ADD COLUMN "ccRecipients" JSONB,
ADD COLUMN "participants" JSONB,
ADD COLUMN "threadKey" TEXT,
ADD COLUMN "externalThreadId" TEXT,
ADD COLUMN "externalMessageId" TEXT,
ADD COLUMN "providerKey" TEXT,
ADD COLUMN "errorCode" TEXT,
ADD COLUMN "errorMessage" TEXT,
ADD COLUMN "rawProviderPayload" JSONB,
ADD COLUMN "attachments" JSONB;

UPDATE "crm"."Activity"
SET
  "direction" = CASE
    WHEN COALESCE(NULLIF(LOWER("messageDirection"), ''), 'outbound') = 'inbound' THEN 'INBOUND'::"crm"."CommunicationDirection"
    ELSE 'OUTBOUND'::"crm"."CommunicationDirection"
  END,
  "communicationStatus" = 'DRAFT'::"crm"."CommunicationLifecycleStatus",
  "channelKey" = COALESCE(NULLIF("channelKey", ''), 'email'),
  "recordSource" = 'SYSTEM'::"crm"."ActivityRecordSource",
  "activityDate" = COALESCE("activityDate", "createdAt")
WHERE "type" = 'COMMUNICATION'::"crm"."ActivityType";

UPDATE "crm"."Activity"
SET "activityDate" = COALESCE("activityDate", "createdAt")
WHERE "activityDate" IS NULL;

-- Channel registry table
CREATE TABLE "crm"."ChannelRegistry" (
  "key" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "category" "crm"."ChannelCategory" NOT NULL,
  "capabilities" JSONB NOT NULL,
  "defaultProviderKey" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ChannelRegistry_pkey" PRIMARY KEY ("key")
);

-- Webhook idempotency/event store
CREATE TABLE "crm"."CommunicationWebhookEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "channelKey" TEXT NOT NULL,
  "externalMessageId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "eventTimestamp" TIMESTAMPTZ(6) NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activityId" TEXT,
  CONSTRAINT "CommunicationWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_webhook_event_dedupe"
  ON "crm"."CommunicationWebhookEvent"("tenantId", "providerKey", "externalMessageId", "eventType", "eventTimestamp");
CREATE INDEX "CommunicationWebhookEvent_tenantId_externalMessageId_eventTimestamp_idx"
  ON "crm"."CommunicationWebhookEvent"("tenantId", "externalMessageId", "eventTimestamp");
CREATE INDEX "CommunicationWebhookEvent_tenantId_providerKey_channelKey_idx"
  ON "crm"."CommunicationWebhookEvent"("tenantId", "providerKey", "channelKey");

ALTER TABLE "crm"."CommunicationWebhookEvent"
  ADD CONSTRAINT "CommunicationWebhookEvent_activityId_fkey"
  FOREIGN KEY ("activityId") REFERENCES "crm"."Activity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Activity indexes
CREATE INDEX "Activity_tenantId_channelKey_direction_communicationStatus_idx"
  ON "crm"."Activity"("tenantId", "channelKey", "direction", "communicationStatus");
CREATE INDEX "Activity_tenantId_externalMessageId_idx"
  ON "crm"."Activity"("tenantId", "externalMessageId");
CREATE INDEX "Activity_tenantId_activityDate_idx"
  ON "crm"."Activity"("tenantId", "activityDate");

-- Seed channel registry (data-driven channels)
INSERT INTO "crm"."ChannelRegistry" ("key", "displayName", "category", "capabilities", "defaultProviderKey", "enabled", "updatedAt") VALUES
('email', 'Email', 'EMAIL', '{"canSendFromCRM":true,"canReceiveInbound":true,"hasDeliveryReceipts":true,"supportsThreads":true,"supportsAttachments":true,"manualOnly":false,"open":true,"copy":true,"log":true,"subject":true,"attachments":true}', 'resend', true, CURRENT_TIMESTAMP),
('whatsapp', 'WhatsApp', 'MESSAGING', '{"canSendFromCRM":true,"canReceiveInbound":true,"hasDeliveryReceipts":true,"supportsThreads":true,"supportsAttachments":false,"manualOnly":false,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', 'meta', true, CURRENT_TIMESTAMP),
('sms', 'SMS', 'MESSAGING', '{"canSendFromCRM":true,"canReceiveInbound":true,"hasDeliveryReceipts":true,"supportsThreads":false,"supportsAttachments":false,"manualOnly":false,"open":false,"copy":true,"log":true,"subject":false,"attachments":false}', 'twilio', true, CURRENT_TIMESTAMP),
('in_app', 'In-App', 'INTERNAL', '{"canSendFromCRM":true,"canReceiveInbound":true,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":true,"manualOnly":false,"open":false,"copy":true,"log":true,"subject":false,"attachments":true}', null, true, CURRENT_TIMESTAMP),
('linkedin', 'LinkedIn', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('facebook_messenger', 'Facebook Messenger', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('instagram_dm', 'Instagram DM', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('x_dm', 'X DM', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('telegram', 'Telegram', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('wechat', 'WeChat', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP),
('line', 'LINE', 'SOCIAL', '{"canSendFromCRM":false,"canReceiveInbound":false,"hasDeliveryReceipts":false,"supportsThreads":true,"supportsAttachments":false,"manualOnly":true,"open":true,"copy":true,"log":true,"subject":false,"attachments":false}', null, true, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE SET
  "displayName" = EXCLUDED."displayName",
  "category" = EXCLUDED."category",
  "capabilities" = EXCLUDED."capabilities",
  "defaultProviderKey" = EXCLUDED."defaultProviderKey",
  "enabled" = EXCLUDED."enabled",
  "updatedAt" = CURRENT_TIMESTAMP;
