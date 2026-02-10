-- CreateEnum
CREATE TYPE "crm"."ClassGroupStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "crm"."ClassSessionStatus" AS ENUM ('PLANNED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "crm"."ClassAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'MAKEUP', 'EXCUSED');

-- CreateEnum
CREATE TYPE "crm"."ClassBillingRunStatus" AS ENUM ('DRAFT', 'INVOICES_CREATED', 'LOCKED', 'FAILED');

-- CreateTable
CREATE TABLE "crm"."ClassGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "defaultPricePerSession" INTEGER NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "schedulePattern" JSONB,
    "status" "crm"."ClassGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ClassSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ(6) NOT NULL,
    "endsAt" TIMESTAMPTZ(6),
    "topic" TEXT,
    "notes" TEXT,
    "status" "crm"."ClassSessionStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ClassEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "classGroupId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "startDate" DATE,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priceOverridePerSession" INTEGER,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ClassAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "crm"."ClassAttendanceStatus" NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClassAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ClassMonthlyBillingRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "status" "crm"."ClassBillingRunStatus" NOT NULL DEFAULT 'DRAFT',
    "runId" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClassMonthlyBillingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."ClassBillingInvoiceLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "billingRunId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassBillingInvoiceLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassGroup_tenantId_workspaceId_idx" ON "crm"."ClassGroup"("tenantId", "workspaceId");

-- CreateIndex
CREATE INDEX "ClassGroup_tenantId_status_idx" ON "crm"."ClassGroup"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ClassSession_tenantId_workspaceId_startsAt_idx" ON "crm"."ClassSession"("tenantId", "workspaceId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassSession_tenantId_classGroupId_idx" ON "crm"."ClassSession"("tenantId", "classGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_tenantId_classGroupId_startsAt_key" ON "crm"."ClassSession"("tenantId", "classGroupId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassEnrollment_tenantId_classGroupId_idx" ON "crm"."ClassEnrollment"("tenantId", "classGroupId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_tenantId_isActive_idx" ON "crm"."ClassEnrollment"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_tenantId_classGroupId_clientId_key" ON "crm"."ClassEnrollment"("tenantId", "classGroupId", "clientId");

-- CreateIndex
CREATE INDEX "ClassAttendance_tenantId_sessionId_idx" ON "crm"."ClassAttendance"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "ClassAttendance_tenantId_enrollmentId_idx" ON "crm"."ClassAttendance"("tenantId", "enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassAttendance_tenantId_sessionId_enrollmentId_key" ON "crm"."ClassAttendance"("tenantId", "sessionId", "enrollmentId");

-- CreateIndex
CREATE INDEX "ClassMonthlyBillingRun_tenantId_status_idx" ON "crm"."ClassMonthlyBillingRun"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMonthlyBillingRun_tenantId_month_key" ON "crm"."ClassMonthlyBillingRun"("tenantId", "month");

-- CreateIndex
CREATE INDEX "ClassBillingInvoiceLink_tenantId_billingRunId_idx" ON "crm"."ClassBillingInvoiceLink"("tenantId", "billingRunId");

-- CreateIndex
CREATE INDEX "ClassBillingInvoiceLink_tenantId_clientId_idx" ON "crm"."ClassBillingInvoiceLink"("tenantId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBillingInvoiceLink_tenantId_billingRunId_clientId_key" ON "crm"."ClassBillingInvoiceLink"("tenantId", "billingRunId", "clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBillingInvoiceLink_tenantId_idempotencyKey_key" ON "crm"."ClassBillingInvoiceLink"("tenantId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "crm"."ClassSession" ADD CONSTRAINT "ClassSession_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "crm"."ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classGroupId_fkey" FOREIGN KEY ("classGroupId") REFERENCES "crm"."ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ClassAttendance" ADD CONSTRAINT "ClassAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "crm"."ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ClassAttendance" ADD CONSTRAINT "ClassAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "crm"."ClassEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."ClassBillingInvoiceLink" ADD CONSTRAINT "ClassBillingInvoiceLink_billingRunId_fkey" FOREIGN KEY ("billingRunId") REFERENCES "crm"."ClassMonthlyBillingRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
