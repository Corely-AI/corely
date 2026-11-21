CREATE UNIQUE INDEX "Workspace_tenantId_id_key" ON "platform"."Workspace" ("tenantId", "id");
CREATE TABLE "platform"."SignTemplateRevision" (
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "templateId" UUID NOT NULL,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "actorId" TEXT NOT NULL,
  "commandId" UUID NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "title" VARCHAR(160) NOT NULL,
  "layout" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tenantId", "workspaceId", "templateId", "revision"),
  FOREIGN KEY ("tenantId","workspaceId") REFERENCES "platform"."Workspace" ("tenantId","id") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "sign_template_command_uq" ON "platform"."SignTemplateRevision" ("tenantId","workspaceId","templateId","actorId","commandId");
