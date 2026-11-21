ALTER TABLE platform."SignReminder" ADD COLUMN "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX sign_reminder_rate_idx ON platform."SignReminder" ("tenantId","workspaceId","requestId","roleId","createdAt");
