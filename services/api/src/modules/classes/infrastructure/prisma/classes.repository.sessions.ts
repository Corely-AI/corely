import type { PrismaService } from "@corely/data";
import type { ClassSessionEntity } from "../../domain/entities/classes.entities";
import type {
  ListPagination,
  SessionListFilters,
} from "../../application/ports/classes-repository.port";
import { toClassSession } from "./prisma.mappers";
import { parseSort } from "./classes.repository.utils";

export const createSession = async (
  prisma: PrismaService,
  session: ClassSessionEntity
): Promise<ClassSessionEntity> => {
  const created = await prisma.classSession.create({
    data: {
      id: session.id,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      classGroupId: session.classGroupId,
      startsAt: session.startsAt,
      endsAt: session.endsAt ?? undefined,
      topic: session.topic ?? undefined,
      notes: session.notes ?? undefined,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
  return toClassSession(created);
};

export const upsertSession = async (
  prisma: PrismaService,
  session: ClassSessionEntity
): Promise<ClassSessionEntity> => {
  const created = await prisma.classSession.upsert({
    where: {
      tenantId_classGroupId_startsAt: {
        tenantId: session.tenantId,
        classGroupId: session.classGroupId,
        startsAt: session.startsAt,
      },
    },
    update: {
      endsAt: session.endsAt ?? undefined,
      topic: session.topic ?? undefined,
      notes: session.notes ?? undefined,
      status: session.status,
      updatedAt: session.updatedAt,
    },
    create: {
      id: session.id,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      classGroupId: session.classGroupId,
      startsAt: session.startsAt,
      endsAt: session.endsAt ?? undefined,
      topic: session.topic ?? undefined,
      notes: session.notes ?? undefined,
      status: session.status,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    },
  });
  return toClassSession(created);
};

export const updateSession = async (
  prisma: PrismaService,
  tenantId: string,
  sessionId: string,
  updates: Partial<ClassSessionEntity>
): Promise<ClassSessionEntity> => {
  const updated = await prisma.classSession.update({
    where: { id: sessionId, tenantId },
    data: {
      startsAt: updates.startsAt,
      endsAt: updates.endsAt ?? undefined,
      topic: updates.topic ?? undefined,
      notes: updates.notes ?? undefined,
      status: updates.status,
      updatedAt: updates.updatedAt,
    },
  });
  return toClassSession(updated);
};

export const findSessionById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  sessionId: string
): Promise<ClassSessionEntity | null> => {
  const row = await prisma.classSession.findFirst({
    where: { id: sessionId, tenantId, workspaceId },
  });
  return row ? toClassSession(row) : null;
};

export const listSessions = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: SessionListFilters,
  pagination: ListPagination
): Promise<{ items: ClassSessionEntity[]; total: number }> => {
  const where: any = { tenantId, workspaceId };
  if (filters.classGroupId) {
    where.classGroupId = filters.classGroupId;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.dateFrom || filters.dateTo) {
    where.startsAt = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { topic: { contains: filters.q, mode: "insensitive" } },
      { notes: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.classSession.findMany({
      where,
      orderBy: parseSort(filters.sort, ["startsAt", "createdAt", "updatedAt"], "startsAt"),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.classSession.count({ where }),
  ]);

  return { items: items.map(toClassSession), total };
};
