CREATE TABLE "platform"."SignRequestDraft" (
  "tenantId" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "requestId" UUID NOT NULL,
  "templateId" UUID NOT NULL, "templateRevision" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL, "commandId" UUID NOT NULL, "fingerprint" CHAR(64) NOT NULL,
  "routing" TEXT NOT NULL CHECK ("routing" IN ('parallel','sequential')), "recipients" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tenantId","workspaceId","requestId"),
  FOREIGN KEY ("tenantId","workspaceId","templateId","templateRevision") REFERENCES "platform"."SignTemplatePublication" ("tenantId","workspaceId","templateId","revision") ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "sign_request_create_uq" ON "platform"."SignRequestDraft" ("tenantId","workspaceId","actorId","commandId");
CREATE INDEX "SignRequestDraft_tenantId_workspaceId_actorId_requestId_idx" ON "platform"."SignRequestDraft" ("tenantId","workspaceId","actorId","requestId");
