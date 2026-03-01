/*
  Warnings:

  - A unique constraint covering the columns `[registerId]` on the table `cash_entry_counters` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "platform"."IntegrationKind" AS ENUM ('SUMUP', 'ADYEN', 'MICROSOFT_GRAPH_MAIL', 'GOOGLE_GMAIL');

-- CreateEnum
CREATE TYPE "platform"."IntegrationAuthMethod" AS ENUM ('API_KEY', 'OAUTH2');

-- CreateEnum
CREATE TYPE "platform"."IntegrationConnectionStatus" AS ENUM ('ACTIVE', 'INVALID', 'DISABLED');

-- CreateEnum
CREATE TYPE "commerce"."CashlessProviderKind" AS ENUM ('SUMUP', 'ADYEN');

-- CreateEnum
CREATE TYPE "commerce"."PaymentAttemptStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'EXPIRED');

-- DropForeignKey
ALTER TABLE "accounting"."cash_entries" DROP CONSTRAINT "cash_entries_reversalOfEntryId_fkey";

-- DropIndex
DROP INDEX "accounting"."cash_registers_tenantId_idx";

-- DropIndex
DROP INDEX "accounting"."cash_registers_workspaceId_idx";

-- AlterTable
ALTER TABLE "accounting"."cash_entries" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- CreateTable
CREATE TABLE "crm"."CrmMailbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "integrationConnectionId" TEXT NOT NULL,
    "provider_kind" VARCHAR(64) NOT NULL,
    "address" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(120),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "sync_cursor" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrmMailbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CrmMailThread" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "external_thread_id" TEXT NOT NULL,
    "subject" TEXT,
    "snippet" TEXT,
    "last_message_at" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrmMailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."CrmMailMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "mailboxId" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "external_message_id" TEXT NOT NULL,
    "direction" "crm"."CommunicationDirection" NOT NULL,
    "subject" TEXT,
    "from_json" JSONB,
    "to_json" JSONB NOT NULL,
    "cc_json" JSONB NOT NULL,
    "bcc_json" JSONB NOT NULL,
    "snippet" TEXT,
    "body_preview" TEXT,
    "sent_at" TIMESTAMPTZ(6),
    "received_at" TIMESTAMPTZ(6),
    "raw_json" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CrmMailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."integration_connections" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "kind" "platform"."IntegrationKind" NOT NULL,
    "auth_method" "platform"."IntegrationAuthMethod" NOT NULL,
    "display_name" VARCHAR(120),
    "config_json" JSONB NOT NULL,
    "secret_encrypted" TEXT,
    "status" "platform"."IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commerce"."payment_attempts" (
    "id" UUID NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "sale_id" UUID,
    "register_id" UUID NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "commerce"."PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "provider_kind" "commerce"."CashlessProviderKind" NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "action_json" JSONB,
    "idempotency_key" VARCHAR(255) NOT NULL,
    "failure_reason" TEXT,
    "paid_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "raw_status_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "resource" JSONB NOT NULL,
    "data" JSONB,
    "dedupeKey" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform"."NotificationRecipient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrmMailbox_tenantId_workspaceId_status_idx" ON "crm"."CrmMailbox"("tenantId", "workspaceId", "status");

-- CreateIndex
CREATE INDEX "CrmMailbox_integrationConnectionId_idx" ON "crm"."CrmMailbox"("integrationConnectionId");

-- CreateIndex
CREATE UNIQUE INDEX "crm_mailbox_tenant_workspace_address" ON "crm"."CrmMailbox"("tenantId", "workspaceId", "address");

-- CreateIndex
CREATE INDEX "CrmMailThread_tenantId_workspaceId_last_message_at_idx" ON "crm"."CrmMailThread"("tenantId", "workspaceId", "last_message_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_mail_thread_mailbox_external" ON "crm"."CrmMailThread"("mailboxId", "external_thread_id");

-- CreateIndex
CREATE INDEX "CrmMailMessage_tenantId_workspaceId_received_at_idx" ON "crm"."CrmMailMessage"("tenantId", "workspaceId", "received_at");

-- CreateIndex
CREATE INDEX "CrmMailMessage_tenantId_workspaceId_sent_at_idx" ON "crm"."CrmMailMessage"("tenantId", "workspaceId", "sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "crm_mail_message_mailbox_external" ON "crm"."CrmMailMessage"("mailboxId", "external_message_id");

-- CreateIndex
CREATE INDEX "integration_connections_tenant_id_workspace_id_idx" ON "platform"."integration_connections"("tenant_id", "workspace_id");

-- CreateIndex
CREATE INDEX "integration_connections_workspace_id_kind_status_idx" ON "platform"."integration_connections"("workspace_id", "kind", "status");

-- CreateIndex
CREATE INDEX "payment_attempts_workspace_id_status_updated_at_idx" ON "commerce"."payment_attempts"("workspace_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "payment_attempts_workspace_id_sale_id_idx" ON "commerce"."payment_attempts"("workspace_id", "sale_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempt_workspace_idempotency" ON "commerce"."payment_attempts"("workspace_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempt_workspace_provider_ref" ON "commerce"."payment_attempts"("workspace_id", "provider_kind", "provider_ref");

-- CreateIndex
CREATE INDEX "Notification_tenantId_workspaceId_createdAt_idx" ON "platform"."Notification"("tenantId", "workspaceId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Notification_tenantId_workspaceId_dedupeKey_key" ON "platform"."Notification"("tenantId", "workspaceId", "dedupeKey");

-- CreateIndex
CREATE INDEX "NotificationRecipient_tenantId_workspaceId_userId_readAt_cr_idx" ON "platform"."NotificationRecipient"("tenantId", "workspaceId", "userId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_notificationId_userId_key" ON "platform"."NotificationRecipient"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "cash_entry_counters_registerId_key" ON "accounting"."cash_entry_counters"("registerId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_workspaceId_idx" ON "accounting"."cash_registers"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "cash_registers_tenantId_workspaceId_name_idx" ON "accounting"."cash_registers"("tenantId", "workspaceId", "name");

-- AddForeignKey
ALTER TABLE "crm"."CrmMailbox" ADD CONSTRAINT "CrmMailbox_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailbox" ADD CONSTRAINT "CrmMailbox_integrationConnectionId_fkey" FOREIGN KEY ("integrationConnectionId") REFERENCES "platform"."integration_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailThread" ADD CONSTRAINT "CrmMailThread_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailThread" ADD CONSTRAINT "CrmMailThread_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "crm"."CrmMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailMessage" ADD CONSTRAINT "CrmMailMessage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailMessage" ADD CONSTRAINT "CrmMailMessage_mailboxId_fkey" FOREIGN KEY ("mailboxId") REFERENCES "crm"."CrmMailbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."CrmMailMessage" ADD CONSTRAINT "CrmMailMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "crm"."CrmMailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."payment_attempts" ADD CONSTRAINT "payment_attempts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commerce"."payment_attempts" ADD CONSTRAINT "payment_attempts_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "commerce"."registers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform"."NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "platform"."Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "accounting"."cash_entries_tenantId_workspaceId_registerId_dayKey_occurredAt_" RENAME TO "cash_entries_tenantId_workspaceId_registerId_dayKey_occurre_idx";

-- RenameIndex
ALTER INDEX "accounting"."cash_entry_attachments_tenantId_workspaceId_entryId_documentId_" RENAME TO "cash_entry_attachments_tenantId_workspaceId_entryId_documen_key";

-- RenameIndex
ALTER INDEX "accounting"."cash_export_artifacts_tenantId_workspaceId_registerId_month_for" RENAME TO "cash_export_artifacts_tenantId_workspaceId_registerId_month_idx";
