CREATE TABLE "platform"."SignTemplatePublication" (
  "tenantId" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "templateId" UUID NOT NULL,
  "revision" INTEGER NOT NULL, "originalSha256" CHAR(64) NOT NULL, "canonicalSha256" CHAR(64) NOT NULL,
  "profile" TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("tenantId","workspaceId","templateId","revision"),
  FOREIGN KEY ("tenantId","workspaceId","templateId","revision") REFERENCES "platform"."SignTemplateRevision" ("tenantId","workspaceId","templateId","revision") ON DELETE RESTRICT ON UPDATE CASCADE
);
