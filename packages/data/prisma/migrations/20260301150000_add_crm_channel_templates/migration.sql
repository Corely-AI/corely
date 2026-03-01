-- Workspace CRM channel templates for composer and settings CRUD

CREATE TABLE IF NOT EXISTS "crm"."ChannelTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "channelKey" VARCHAR(64) NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "subject" VARCHAR(300),
  "body" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "updatedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "ChannelTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_channel_template_workspace_channel_name_key"
  ON "crm"."ChannelTemplate"("tenantId", "workspaceId", "channelKey", "name");

CREATE INDEX IF NOT EXISTS "crm_channel_template_tenant_workspace_channel_updated_idx"
  ON "crm"."ChannelTemplate"("tenantId", "workspaceId", "channelKey", "updatedAt");

ALTER TABLE "crm"."ChannelTemplate"
  ADD CONSTRAINT "ChannelTemplate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
