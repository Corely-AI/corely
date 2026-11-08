-- CreateTable
CREATE TABLE "identity"."SsoCentralSession" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handleHash" TEXT NOT NULL,
    "credentialHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "idleExpiresAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "SsoCentralSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."SsoLoginTransaction" (
    "id" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "appKey" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "stateHash" TEXT NOT NULL,
    "stateCipher" TEXT NOT NULL,
    "verifierCipher" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "codeHash" TEXT,
    "codeExpiresAt" TIMESTAMPTZ(6),
    "familyId" TEXT,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "SsoLoginTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."SsoAppSession" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "appKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handleHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "idleExpiresAt" TIMESTAMPTZ(6) NOT NULL,
    "revokedAt" TIMESTAMPTZ(6),

    CONSTRAINT "SsoAppSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."SsoAttemptBudget" (
    "id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SsoAttemptBudget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "identity"."SsoEmailChallenge" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "credentialHash" TEXT,
    "codeHash" TEXT NOT NULL,
    "codeCipher" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMPTZ(6),

    CONSTRAINT "SsoEmailChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SsoCentralSession_handleHash_key" ON "identity"."SsoCentralSession"("handleHash");

-- CreateIndex
CREATE INDEX "SsoCentralSession_environment_userId_idx" ON "identity"."SsoCentralSession"("environment", "userId");

-- CreateIndex
CREATE INDEX "SsoCentralSession_expiresAt_idx" ON "identity"."SsoCentralSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SsoLoginTransaction_codeHash_key" ON "identity"."SsoLoginTransaction"("codeHash");

-- CreateIndex
CREATE INDEX "SsoLoginTransaction_expiresAt_idx" ON "identity"."SsoLoginTransaction"("expiresAt");

-- CreateIndex
CREATE INDEX "SsoLoginTransaction_familyId_idx" ON "identity"."SsoLoginTransaction"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "SsoAppSession_handleHash_key" ON "identity"."SsoAppSession"("handleHash");

-- CreateIndex
CREATE INDEX "SsoAppSession_environment_userId_idx" ON "identity"."SsoAppSession"("environment", "userId");

-- CreateIndex
CREATE INDEX "SsoAppSession_familyId_idx" ON "identity"."SsoAppSession"("familyId");

-- CreateIndex
CREATE INDEX "SsoAppSession_expiresAt_idx" ON "identity"."SsoAppSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SsoAttemptBudget_expiresAt_idx" ON "identity"."SsoAttemptBudget"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SsoEmailChallenge_transactionId_key" ON "identity"."SsoEmailChallenge"("transactionId");

-- CreateIndex
CREATE INDEX "SsoEmailChallenge_expiresAt_idx" ON "identity"."SsoEmailChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "identity"."SsoCentralSession" ADD CONSTRAINT "SsoCentralSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "identity"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."SsoLoginTransaction" ADD CONSTRAINT "SsoLoginTransaction_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "identity"."SsoCentralSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."SsoAppSession" ADD CONSTRAINT "SsoAppSession_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "identity"."SsoCentralSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "identity"."SsoEmailChallenge" ADD CONSTRAINT "SsoEmailChallenge_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "identity"."SsoLoginTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
