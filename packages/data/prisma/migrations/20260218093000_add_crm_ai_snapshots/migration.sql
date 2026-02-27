CREATE TABLE "crm"."DealAiSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "ttlExpiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealAiSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DealAiSnapshot_tenantId_workspaceId_dealId_kind_generatedAt_idx"
ON "crm"."DealAiSnapshot"("tenantId", "workspaceId", "dealId", "kind", "generatedAt" DESC);

CREATE INDEX "DealAiSnapshot_tenantId_workspaceId_kind_ttlExpiresAt_idx"
ON "crm"."DealAiSnapshot"("tenantId", "workspaceId", "kind", "ttlExpiresAt");

ALTER TABLE "crm"."DealAiSnapshot"
ADD CONSTRAINT "DealAiSnapshot_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "crm"."Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
