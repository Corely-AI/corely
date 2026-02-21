import type { PrismaService } from "@corely/data";
import type { ClassMilestoneCompletionEntity } from "../../domain/entities/classes.entities";
import { toMilestoneCompletion } from "./prisma.mappers";

export const upsertMilestoneCompletion = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  milestoneId: string,
  enrollmentId: string,
  data: ClassMilestoneCompletionEntity
): Promise<ClassMilestoneCompletionEntity> => {
  const row = await prisma.classMilestoneCompletion.upsert({
    where: {
      tenantId_milestoneId_enrollmentId: {
        tenantId,
        milestoneId,
        enrollmentId,
      },
    },
    update: {
      status: data.status,
      score: data.score ?? undefined,
      feedback: data.feedback ?? undefined,
      gradedByPartyId: data.gradedByPartyId ?? undefined,
      gradedAt: data.gradedAt ?? undefined,
      updatedAt: data.updatedAt,
    },
    create: {
      id: data.id,
      tenantId,
      workspaceId,
      milestoneId,
      enrollmentId,
      status: data.status,
      score: data.score ?? undefined,
      feedback: data.feedback ?? undefined,
      gradedByPartyId: data.gradedByPartyId ?? undefined,
      gradedAt: data.gradedAt ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  });
  return toMilestoneCompletion(row);
};

export const listMilestoneCompletionsByClassGroup = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string
): Promise<ClassMilestoneCompletionEntity[]> => {
  const rows = await prisma.classMilestoneCompletion.findMany({
    where: {
      tenantId,
      workspaceId,
      milestone: {
        classGroupId,
      },
    },
    orderBy: [{ milestoneId: "asc" }, { enrollmentId: "asc" }],
  });
  return rows.map(toMilestoneCompletion);
};
