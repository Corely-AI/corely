-- AlterTable
ALTER TABLE "identity"."Tenant" ADD COLUMN     "billingMethod" TEXT,
ADD COLUMN     "billingNote" TEXT,
ADD COLUMN     "plan" TEXT,
ADD COLUMN     "planStatus" TEXT,
ADD COLUMN     "planUpdatedAt" TIMESTAMPTZ(6),
ADD COLUMN     "planUpdatedBy" TEXT;
