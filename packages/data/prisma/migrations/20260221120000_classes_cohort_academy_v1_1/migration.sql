-- Classes Cohort Academy v1.1

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassGroupKind' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassGroupKind" AS ENUM ('COHORT', 'DROP_IN', 'OFFICE_HOURS', 'WORKSHOP');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassGroupLifecycle' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassGroupLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'RUNNING', 'ENDED', 'ARCHIVED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassDeliveryMode' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassDeliveryMode" AS ENUM ('ONLINE', 'HYBRID', 'IN_PERSON');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassGroupInstructorRole' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassGroupInstructorRole" AS ENUM ('INSTRUCTOR', 'MENTOR', 'TA');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassSessionType' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassSessionType" AS ENUM ('LECTURE', 'LAB', 'OFFICE_HOURS', 'REVIEW', 'DEMO_DAY');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'MeetingProvider' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."MeetingProvider" AS ENUM ('ZOOM', 'GOOGLE_MEET', 'TEAMS', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassEnrollmentStatus' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassEnrollmentStatus" AS ENUM ('APPLIED', 'ENROLLED', 'DEFERRED', 'DROPPED', 'COMPLETED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassEnrollmentSeatType' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassEnrollmentSeatType" AS ENUM ('LEARNER', 'AUDITOR', 'SPONSORED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassEnrollmentSource' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassEnrollmentSource" AS ENUM ('SELF_SERVE', 'SALES', 'ADMIN', 'PARTNER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassEnrollmentBillingPlanType' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassEnrollmentBillingPlanType" AS ENUM ('UPFRONT', 'INSTALLMENTS', 'INVOICE_NET', 'SUBSCRIPTION');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassBillingInvoicePurpose' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassBillingInvoicePurpose" AS ENUM ('DEPOSIT', 'INSTALLMENT', 'FINAL', 'ADHOC', 'MONTHLY_RUN');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassMilestoneType' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassMilestoneType" AS ENUM ('PROJECT', 'ASSESSMENT', 'CHECKPOINT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassMilestoneCompletionStatus' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassMilestoneCompletionStatus" AS ENUM ('NOT_STARTED', 'SUBMITTED', 'PASSED', 'FAILED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassResourceType' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassResourceType" AS ENUM ('RECORDING', 'DOC', 'LINK');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ClassResourceVisibility' AND n.nspname = 'crm'
  ) THEN
    CREATE TYPE "crm"."ClassResourceVisibility" AS ENUM ('ENROLLED_ONLY', 'PUBLIC');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm"."ClassProgram" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "levelTag" TEXT,
  "expectedSessionsCount" INTEGER,
  "defaultTimezone" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassProgram_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassProgram_tenantId_workspaceId_idx" ON "crm"."ClassProgram" ("tenantId", "workspaceId");
CREATE INDEX IF NOT EXISTS "ClassProgram_tenantId_levelTag_idx" ON "crm"."ClassProgram" ("tenantId", "levelTag");

CREATE TABLE IF NOT EXISTS "crm"."ClassProgramSessionTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "title" TEXT,
  "defaultDurationMin" INTEGER,
  "type" "crm"."ClassSessionType" NOT NULL DEFAULT 'LECTURE',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassProgramSessionTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassProgramSessionTemplate_tenantId_programId_index_key" ON "crm"."ClassProgramSessionTemplate" ("tenantId", "programId", "index");
CREATE INDEX IF NOT EXISTS "ClassProgramSessionTemplate_tenantId_programId_idx" ON "crm"."ClassProgramSessionTemplate" ("tenantId", "programId");

CREATE TABLE IF NOT EXISTS "crm"."ClassProgramMilestoneTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "type" "crm"."ClassMilestoneType" NOT NULL DEFAULT 'CHECKPOINT',
  "required" BOOLEAN NOT NULL DEFAULT true,
  "index" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassProgramMilestoneTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassProgramMilestoneTemplate_tenantId_programId_index_key" ON "crm"."ClassProgramMilestoneTemplate" ("tenantId", "programId", "index");
CREATE INDEX IF NOT EXISTS "ClassProgramMilestoneTemplate_tenantId_programId_idx" ON "crm"."ClassProgramMilestoneTemplate" ("tenantId", "programId");

ALTER TABLE "crm"."ClassGroup"
  ADD COLUMN IF NOT EXISTS "kind" "crm"."ClassGroupKind" NOT NULL DEFAULT 'COHORT',
  ADD COLUMN IF NOT EXISTS "lifecycle" "crm"."ClassGroupLifecycle" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "startAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "endAt" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS "capacity" INTEGER,
  ADD COLUMN IF NOT EXISTS "waitlistEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deliveryMode" "crm"."ClassDeliveryMode" NOT NULL DEFAULT 'ONLINE',
  ADD COLUMN IF NOT EXISTS "communityUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "programId" TEXT;

CREATE INDEX IF NOT EXISTS "ClassGroup_tenantId_kind_idx" ON "crm"."ClassGroup"("tenantId", "kind");
CREATE INDEX IF NOT EXISTS "ClassGroup_tenantId_lifecycle_idx" ON "crm"."ClassGroup"("tenantId", "lifecycle");
CREATE INDEX IF NOT EXISTS "ClassGroup_tenantId_startAt_idx" ON "crm"."ClassGroup"("tenantId", "startAt");
CREATE INDEX IF NOT EXISTS "ClassGroup_tenantId_programId_idx" ON "crm"."ClassGroup"("tenantId", "programId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassGroup_programId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassGroup"
      ADD CONSTRAINT "ClassGroup_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "crm"."ClassProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm"."ClassGroupInstructor" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "partyId" TEXT NOT NULL,
  "role" "crm"."ClassGroupInstructorRole" NOT NULL DEFAULT 'INSTRUCTOR',
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassGroupInstructor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassGroupInstructor_tenantId_classGroupId_partyId_role_key" ON "crm"."ClassGroupInstructor"("tenantId", "classGroupId", "partyId", "role");
CREATE INDEX IF NOT EXISTS "ClassGroupInstructor_tenantId_partyId_idx" ON "crm"."ClassGroupInstructor"("tenantId", "partyId");
CREATE INDEX IF NOT EXISTS "ClassGroupInstructor_tenantId_classGroupId_idx" ON "crm"."ClassGroupInstructor"("tenantId", "classGroupId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassGroupInstructor_classGroupId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassGroupInstructor"
      ADD CONSTRAINT "ClassGroupInstructor_classGroupId_fkey"
      FOREIGN KEY ("classGroupId") REFERENCES "crm"."ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "crm"."ClassSession"
  ADD COLUMN IF NOT EXISTS "type" "crm"."ClassSessionType" NOT NULL DEFAULT 'LECTURE',
  ADD COLUMN IF NOT EXISTS "meetingProvider" "crm"."MeetingProvider",
  ADD COLUMN IF NOT EXISTS "meetingJoinUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "meetingExternalId" TEXT;

ALTER TABLE "crm"."ClassEnrollment"
  ADD COLUMN IF NOT EXISTS "status" "crm"."ClassEnrollmentStatus" DEFAULT 'ENROLLED',
  ADD COLUMN IF NOT EXISTS "payerPartyId" TEXT,
  ADD COLUMN IF NOT EXISTS "seatType" "crm"."ClassEnrollmentSeatType" DEFAULT 'LEARNER',
  ADD COLUMN IF NOT EXISTS "source" "crm"."ClassEnrollmentSource" DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS "priceCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "currency" VARCHAR(3),
  ADD COLUMN IF NOT EXISTS "discountCents" INTEGER,
  ADD COLUMN IF NOT EXISTS "discountLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "placementLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "placementGoal" TEXT,
  ADD COLUMN IF NOT EXISTS "placementNote" TEXT;

UPDATE "crm"."ClassEnrollment"
SET "status" = 'ENROLLED'
WHERE "status" IS NULL;

ALTER TABLE "crm"."ClassEnrollment"
  ALTER COLUMN "status" SET DEFAULT 'ENROLLED',
  ALTER COLUMN "status" SET NOT NULL;

ALTER TABLE "crm"."ClassEnrollment"
  ALTER COLUMN "seatType" SET DEFAULT 'LEARNER',
  ALTER COLUMN "seatType" SET NOT NULL;

ALTER TABLE "crm"."ClassEnrollment"
  ALTER COLUMN "source" SET DEFAULT 'ADMIN',
  ALTER COLUMN "source" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "ClassEnrollment_tenantId_status_idx" ON "crm"."ClassEnrollment"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "ClassEnrollment_tenantId_payerPartyId_idx" ON "crm"."ClassEnrollment"("tenantId", "payerPartyId");

CREATE TABLE IF NOT EXISTS "crm"."ClassEnrollmentBillingPlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "type" "crm"."ClassEnrollmentBillingPlanType" NOT NULL,
  "scheduleJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassEnrollmentBillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassEnrollmentBillingPlan_enrollmentId_key" ON "crm"."ClassEnrollmentBillingPlan"("enrollmentId");
CREATE INDEX IF NOT EXISTS "ClassEnrollmentBillingPlan_tenantId_workspaceId_idx" ON "crm"."ClassEnrollmentBillingPlan"("tenantId", "workspaceId");
CREATE INDEX IF NOT EXISTS "ClassEnrollmentBillingPlan_tenantId_type_idx" ON "crm"."ClassEnrollmentBillingPlan"("tenantId", "type");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassEnrollmentBillingPlan_enrollmentId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassEnrollmentBillingPlan"
      ADD CONSTRAINT "ClassEnrollmentBillingPlan_enrollmentId_fkey"
      FOREIGN KEY ("enrollmentId") REFERENCES "crm"."ClassEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "crm"."ClassBillingInvoiceLink"
  ADD COLUMN IF NOT EXISTS "enrollmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "purpose" "crm"."ClassBillingInvoicePurpose" DEFAULT 'MONTHLY_RUN';

UPDATE "crm"."ClassBillingInvoiceLink"
SET "purpose" = 'MONTHLY_RUN'
WHERE "purpose" IS NULL;

ALTER TABLE "crm"."ClassBillingInvoiceLink"
  ALTER COLUMN "purpose" SET DEFAULT 'MONTHLY_RUN',
  ALTER COLUMN "purpose" SET NOT NULL,
  ALTER COLUMN "billingRunId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "ClassBillingInvoiceLink_tenantId_enrollmentId_idx" ON "crm"."ClassBillingInvoiceLink"("tenantId", "enrollmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassBillingInvoiceLink_enrollmentId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassBillingInvoiceLink"
      ADD CONSTRAINT "ClassBillingInvoiceLink_enrollmentId_fkey"
      FOREIGN KEY ("enrollmentId") REFERENCES "crm"."ClassEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm"."ClassMilestone" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "programMilestoneTemplateId" TEXT,
  "title" TEXT NOT NULL,
  "type" "crm"."ClassMilestoneType" NOT NULL DEFAULT 'CHECKPOINT',
  "dueAt" TIMESTAMPTZ(6),
  "required" BOOLEAN NOT NULL DEFAULT true,
  "index" INTEGER,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassMilestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassMilestone_tenantId_classGroupId_idx" ON "crm"."ClassMilestone"("tenantId", "classGroupId");
CREATE INDEX IF NOT EXISTS "ClassMilestone_tenantId_dueAt_idx" ON "crm"."ClassMilestone"("tenantId", "dueAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassMilestone_classGroupId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassMilestone"
      ADD CONSTRAINT "ClassMilestone_classGroupId_fkey"
      FOREIGN KEY ("classGroupId") REFERENCES "crm"."ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassMilestone_programMilestoneTemplateId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassMilestone"
      ADD CONSTRAINT "ClassMilestone_programMilestoneTemplateId_fkey"
      FOREIGN KEY ("programMilestoneTemplateId") REFERENCES "crm"."ClassProgramMilestoneTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm"."ClassMilestoneCompletion" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "milestoneId" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "status" "crm"."ClassMilestoneCompletionStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "score" INTEGER,
  "feedback" TEXT,
  "gradedByPartyId" TEXT,
  "gradedAt" TIMESTAMPTZ(6),
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassMilestoneCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ClassMilestoneCompletion_tenantId_milestoneId_enrollmentId_key" ON "crm"."ClassMilestoneCompletion"("tenantId", "milestoneId", "enrollmentId");
CREATE INDEX IF NOT EXISTS "ClassMilestoneCompletion_tenantId_enrollmentId_idx" ON "crm"."ClassMilestoneCompletion"("tenantId", "enrollmentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassMilestoneCompletion_milestoneId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassMilestoneCompletion"
      ADD CONSTRAINT "ClassMilestoneCompletion_milestoneId_fkey"
      FOREIGN KEY ("milestoneId") REFERENCES "crm"."ClassMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassMilestoneCompletion_enrollmentId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassMilestoneCompletion"
      ADD CONSTRAINT "ClassMilestoneCompletion_enrollmentId_fkey"
      FOREIGN KEY ("enrollmentId") REFERENCES "crm"."ClassEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "crm"."ClassGroupResource" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "classGroupId" TEXT NOT NULL,
  "type" "crm"."ClassResourceType" NOT NULL,
  "title" TEXT NOT NULL,
  "documentId" TEXT,
  "url" TEXT,
  "visibility" "crm"."ClassResourceVisibility" NOT NULL DEFAULT 'ENROLLED_ONLY',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassGroupResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ClassGroupResource_tenantId_classGroupId_sortOrder_idx" ON "crm"."ClassGroupResource"("tenantId", "classGroupId", "sortOrder");
CREATE INDEX IF NOT EXISTS "ClassGroupResource_tenantId_documentId_idx" ON "crm"."ClassGroupResource"("tenantId", "documentId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassGroupResource_classGroupId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassGroupResource"
      ADD CONSTRAINT "ClassGroupResource_classGroupId_fkey"
      FOREIGN KEY ("classGroupId") REFERENCES "crm"."ClassGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassProgramSessionTemplate_programId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassProgramSessionTemplate"
      ADD CONSTRAINT "ClassProgramSessionTemplate_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "crm"."ClassProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ClassProgramMilestoneTemplate_programId_fkey'
  ) THEN
    ALTER TABLE "crm"."ClassProgramMilestoneTemplate"
      ADD CONSTRAINT "ClassProgramMilestoneTemplate_programId_fkey"
      FOREIGN KEY ("programId") REFERENCES "crm"."ClassProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
