-- AlterTable
ALTER TABLE "crm"."ClassEnrollmentBillingPlan" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassGroupInstructor" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassGroupResource" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassMilestone" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassMilestoneCompletion" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassProgram" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassProgramMilestoneTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."ClassProgramSessionTemplate" ALTER COLUMN "updatedAt" DROP DEFAULT;
