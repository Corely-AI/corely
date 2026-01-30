-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM (
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DATE',
  'BOOLEAN',
  'SINGLE_SELECT',
  'MULTI_SELECT',
  'EMAIL'
);

-- CreateEnum
CREATE TYPE "FormSubmissionSource" AS ENUM ('PUBLIC', 'INTERNAL');

-- CreateTable
CREATE TABLE "FormDefinition" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
  "publicId" TEXT,
  "publicTokenHash" TEXT,
  "publishedAt" TIMESTAMPTZ(6),
  "archivedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "FormDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "FormFieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "helpText" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "configJson" JSONB,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL,

  CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "source" "FormSubmissionSource" NOT NULL DEFAULT 'PUBLIC',
  "payloadJson" JSONB NOT NULL,
  "submittedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FormDefinition_tenantId_name_key" ON "FormDefinition"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FormDefinition_publicId_key" ON "FormDefinition"("publicId");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_idx" ON "FormDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_status_idx" ON "FormDefinition"("tenantId", "status");

-- CreateIndex
CREATE INDEX "FormDefinition_tenantId_archivedAt_idx" ON "FormDefinition"("tenantId", "archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FormField_formId_key_key" ON "FormField"("formId", "key");

-- CreateIndex
CREATE INDEX "FormField_formId_order_idx" ON "FormField"("formId", "order");

-- CreateIndex
CREATE INDEX "FormField_tenantId_idx" ON "FormField"("tenantId");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_submittedAt_idx" ON "FormSubmission"("formId", "submittedAt");

-- CreateIndex
CREATE INDEX "FormSubmission_tenantId_idx" ON "FormSubmission"("tenantId");

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "FormDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
