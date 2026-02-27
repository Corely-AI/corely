import type { PrismaService } from "@corely/data";
import type { ClassMilestoneEntity } from "../../domain/entities/classes.entities";
import { toMilestone } from "./prisma.mappers";

export const listMilestonesByClassGroup = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string
): Promise<ClassMilestoneEntity[]> => {
  const rows = await prisma.classMilestone.findMany({
    where: { tenantId, workspaceId, classGroupId },
    orderBy: [{ index: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toMilestone);
};

export const createMilestone = async (
  prisma: PrismaService,
  milestone: ClassMilestoneEntity
): Promise<ClassMilestoneEntity> => {
  const row = await prisma.classMilestone.create({
    data: {
      id: milestone.id,
      tenantId: milestone.tenantId,
      workspaceId: milestone.workspaceId,
      classGroupId: milestone.classGroupId,
      programMilestoneTemplateId: milestone.programMilestoneTemplateId ?? undefined,
      title: milestone.title,
      type: milestone.type,
      dueAt: milestone.dueAt ?? undefined,
      required: milestone.required,
      index: milestone.index ?? undefined,
      createdAt: milestone.createdAt,
      updatedAt: milestone.updatedAt,
    },
  });
  return toMilestone(row);
};

export const updateMilestone = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  milestoneId: string,
  updates: Partial<ClassMilestoneEntity>
): Promise<ClassMilestoneEntity> => {
  const row = await prisma.classMilestone.update({
    where: { id: milestoneId, tenantId, workspaceId },
    data: {
      title: updates.title,
      type: updates.type,
      dueAt: updates.dueAt ?? undefined,
      required: updates.required,
      index: updates.index ?? undefined,
      programMilestoneTemplateId: updates.programMilestoneTemplateId ?? undefined,
      updatedAt: updates.updatedAt,
    },
  });
  return toMilestone(row);
};

export const deleteMilestone = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  milestoneId: string
): Promise<void> => {
  await prisma.classMilestone.delete({
    where: { id: milestoneId, tenantId, workspaceId },
  });
};

export const findMilestoneById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  milestoneId: string
): Promise<ClassMilestoneEntity | null> => {
  const row = await prisma.classMilestone.findFirst({
    where: { id: milestoneId, tenantId, workspaceId },
  });
  return row ? toMilestone(row) : null;
};
