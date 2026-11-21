CREATE TABLE platform."SignCeremony" (
 "tenantId" TEXT NOT NULL, "workspaceId" TEXT NOT NULL, "requestId" UUID NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('SENT','DECLINED','VOID','EXPIRED','COLLECTED','COMPLETED')),
 "expiresAt" TIMESTAMPTZ(6) NOT NULL, "sentAt" TIMESTAMPTZ(6) NOT NULL, consent TEXT NOT NULL, invitation TEXT NOT NULL,
 revision INTEGER NOT NULL DEFAULT 1, "artifactSha256" TEXT, "evidenceSha256" TEXT,
 PRIMARY KEY ("tenantId","workspaceId","requestId"),
 FOREIGN KEY ("tenantId","workspaceId","requestId") REFERENCES platform."SignRequestDraft" ("tenantId","workspaceId","requestId") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE INDEX "SignCeremony_status_expiresAt_idx" ON platform."SignCeremony"(status,"expiresAt");
CREATE TABLE platform."SignCeremonyRecipient" (
 id UUID PRIMARY KEY,"tenantId" TEXT NOT NULL,"workspaceId" TEXT NOT NULL,"requestId" UUID NOT NULL,"roleId" TEXT NOT NULL,position INTEGER NOT NULL,
 status TEXT NOT NULL CHECK(status IN ('WAITING','INVITED','ACCEPTED')), "tokenDigest" TEXT UNIQUE,envelope TEXT,"sessionDigest" TEXT UNIQUE,
 "sessionUntil" TIMESTAMPTZ(6),"deliveredAt" TIMESTAMPTZ(6),"acceptedAt" TIMESTAMPTZ(6),"values" JSONB,"reviewedSha256" TEXT,
 UNIQUE("tenantId","workspaceId","requestId","roleId"),
 FOREIGN KEY ("tenantId","workspaceId","requestId") REFERENCES platform."SignCeremony"("tenantId","workspaceId","requestId") ON DELETE RESTRICT ON UPDATE CASCADE);
