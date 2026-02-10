-- AlterTable
ALTER TABLE "workflow"."AuditLog" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workflow"."DomainEvent" ALTER COLUMN "tenantId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workflow"."OutboxEvent" ALTER COLUMN "tenantId" DROP NOT NULL;
