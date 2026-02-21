import type { PrismaService } from "@corely/data";
import type {
  ClassProgramEntity,
  ClassProgramMilestoneTemplateEntity,
  ClassProgramSessionTemplateEntity,
} from "../../domain/entities/classes.entities";
import type {
  ListPagination,
  ProgramListFilters,
} from "../../application/ports/classes-repository.port";
import { toProgram, toProgramMilestoneTemplate, toProgramSessionTemplate } from "./prisma.mappers";
import { parseSort } from "./classes.repository.utils";

export const createProgram = async (
  prisma: PrismaService,
  program: ClassProgramEntity
): Promise<ClassProgramEntity> => {
  const row = await prisma.classProgram.create({
    data: {
      id: program.id,
      tenantId: program.tenantId,
      workspaceId: program.workspaceId,
      title: program.title,
      description: program.description ?? undefined,
      levelTag: program.levelTag ?? undefined,
      expectedSessionsCount: program.expectedSessionsCount ?? undefined,
      defaultTimezone: program.defaultTimezone ?? undefined,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    },
  });
  return toProgram(row);
};

export const updateProgram = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string,
  updates: Partial<ClassProgramEntity>
): Promise<ClassProgramEntity> => {
  const row = await prisma.classProgram.update({
    where: { id: programId, tenantId, workspaceId },
    data: {
      title: updates.title,
      description: updates.description ?? undefined,
      levelTag: updates.levelTag ?? undefined,
      expectedSessionsCount: updates.expectedSessionsCount ?? undefined,
      defaultTimezone: updates.defaultTimezone ?? undefined,
      updatedAt: updates.updatedAt,
    },
  });
  return toProgram(row);
};

export const findProgramById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string
): Promise<ClassProgramEntity | null> => {
  const row = await prisma.classProgram.findFirst({
    where: { id: programId, tenantId, workspaceId },
  });
  return row ? toProgram(row) : null;
};

export const listPrograms = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: ProgramListFilters,
  pagination: ListPagination
): Promise<{ items: ClassProgramEntity[]; total: number }> => {
  const where: any = { tenantId, workspaceId };
  if (filters.levelTag) {
    where.levelTag = filters.levelTag;
  }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
      { levelTag: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.classProgram.findMany({
      where,
      orderBy: parseSort(
        filters.sort,
        ["updatedAt", "createdAt", "title", "levelTag", "expectedSessionsCount"],
        "updatedAt"
      ),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.classProgram.count({ where }),
  ]);

  return { items: items.map(toProgram), total };
};

export const replaceProgramSessionTemplates = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string,
  items: ClassProgramSessionTemplateEntity[]
): Promise<ClassProgramSessionTemplateEntity[]> => {
  await prisma.$transaction(async (tx) => {
    await tx.classProgramSessionTemplate.deleteMany({
      where: { tenantId, workspaceId, programId },
    });

    if (items.length > 0) {
      await tx.classProgramSessionTemplate.createMany({
        data: items.map((item) => ({
          id: item.id,
          tenantId,
          workspaceId,
          programId,
          index: item.index,
          title: item.title ?? undefined,
          defaultDurationMin: item.defaultDurationMin ?? undefined,
          type: item.type,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });
    }
  });

  const rows = await prisma.classProgramSessionTemplate.findMany({
    where: { tenantId, workspaceId, programId },
    orderBy: { index: "asc" },
  });
  return rows.map(toProgramSessionTemplate);
};

export const replaceProgramMilestoneTemplates = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string,
  items: ClassProgramMilestoneTemplateEntity[]
): Promise<ClassProgramMilestoneTemplateEntity[]> => {
  await prisma.$transaction(async (tx) => {
    await tx.classProgramMilestoneTemplate.deleteMany({
      where: { tenantId, workspaceId, programId },
    });

    if (items.length > 0) {
      await tx.classProgramMilestoneTemplate.createMany({
        data: items.map((item) => ({
          id: item.id,
          tenantId,
          workspaceId,
          programId,
          title: item.title,
          type: item.type,
          required: item.required,
          index: item.index,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      });
    }
  });

  const rows = await prisma.classProgramMilestoneTemplate.findMany({
    where: { tenantId, workspaceId, programId },
    orderBy: { index: "asc" },
  });
  return rows.map(toProgramMilestoneTemplate);
};

export const listProgramSessionTemplates = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string
): Promise<ClassProgramSessionTemplateEntity[]> => {
  const rows = await prisma.classProgramSessionTemplate.findMany({
    where: { tenantId, workspaceId, programId },
    orderBy: { index: "asc" },
  });
  return rows.map(toProgramSessionTemplate);
};

export const listProgramMilestoneTemplates = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  programId: string
): Promise<ClassProgramMilestoneTemplateEntity[]> => {
  const rows = await prisma.classProgramMilestoneTemplate.findMany({
    where: { tenantId, workspaceId, programId },
    orderBy: { index: "asc" },
  });
  return rows.map(toProgramMilestoneTemplate);
};
