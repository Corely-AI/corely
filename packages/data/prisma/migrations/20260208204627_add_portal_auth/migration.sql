-- AlterTable
ALTER TABLE "identity"."User" ADD COLUMN     "partyId" TEXT;

-- CreateTable
CREATE TABLE "identity"."PortalOtpCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "consumedAt" TIMESTAMPTZ(6),
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortalOtpCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."PortalSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),
    "lastUsedAt" TIMESTAMPTZ(6),
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PortalSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortalOtpCode_tenantId_workspaceId_emailNormalized_idx" ON "identity"."PortalOtpCode"("tenantId", "workspaceId", "emailNormalized");

-- CreateIndex
CREATE INDEX "PortalOtpCode_tenantId_workspaceId_emailNormalized_expiresA_idx" ON "identity"."PortalOtpCode"("tenantId", "workspaceId", "emailNormalized", "expiresAt");

-- CreateIndex
CREATE INDEX "PortalOtpCode_expiresAt_idx" ON "identity"."PortalOtpCode"("expiresAt");

-- CreateIndex
CREATE INDEX "PortalSession_tenantId_workspaceId_userId_idx" ON "identity"."PortalSession"("tenantId", "workspaceId", "userId");

-- CreateIndex
CREATE INDEX "PortalSession_refreshTokenHash_idx" ON "identity"."PortalSession"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "PortalSession_expiresAt_idx" ON "identity"."PortalSession"("expiresAt");

-- CreateIndex
CREATE INDEX "User_partyId_idx" ON "identity"."User"("partyId");
