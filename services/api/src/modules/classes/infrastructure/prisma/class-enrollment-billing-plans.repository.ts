import type { PrismaService } from "@corely/data";
import type { ClassEnrollmentBillingPlanEntity } from "../../domain/entities/classes.entities";
import { toEnrollmentBillingPlan } from "./prisma.mappers";

export const findEnrollmentBillingPlan = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<ClassEnrollmentBillingPlanEntity | null> => {
  const row = await prisma.classEnrollmentBillingPlan.findFirst({
    where: { tenantId, workspaceId, enrollmentId },
  });
  return row ? toEnrollmentBillingPlan(row) : null;
};

export const upsertEnrollmentBillingPlan = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  enrollmentId: string,
  data: ClassEnrollmentBillingPlanEntity
): Promise<ClassEnrollmentBillingPlanEntity> => {
  const row = await prisma.classEnrollmentBillingPlan.upsert({
    where: { enrollmentId },
    update: {
      type: data.type,
      scheduleJson: data.scheduleJson as any,
      updatedAt: data.updatedAt,
    },
    create: {
      id: data.id,
      tenantId,
      workspaceId,
      enrollmentId,
      type: data.type,
      scheduleJson: data.scheduleJson as any,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  });
  return toEnrollmentBillingPlan(row);
};
