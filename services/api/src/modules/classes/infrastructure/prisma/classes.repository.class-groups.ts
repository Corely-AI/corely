import type { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import type { ClassGroupEntity } from "../../domain/entities/classes.entities";
import type {
  ClassGroupListFilters,
  ListPagination,
} from "../../application/ports/classes-repository.port";
import { toClassGroup } from "./prisma.mappers";
import { parseSort } from "./classes.repository.utils";

const toJsonValue = (value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined => {
  if (!value) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
};

export const createClassGroup = async (
  prisma: PrismaService,
  group: ClassGroupEntity
): Promise<ClassGroupEntity> => {
  const created = await prisma.classGroup.create({
    data: {
      id: group.id,
      tenantId: group.tenantId,
      workspaceId: group.workspaceId,
      name: group.name,
      subject: group.subject,
      level: group.level,
      defaultPricePerSession: group.defaultPricePerSession,
      currency: group.currency,
      schedulePattern: toJsonValue(group.schedulePattern),
      status: group.status,
      kind: group.kind,
      lifecycle: group.lifecycle,
      startAt: group.startAt ?? undefined,
      endAt: group.endAt ?? undefined,
      timezone: group.timezone,
      capacity: group.capacity ?? undefined,
      waitlistEnabled: group.waitlistEnabled,
      deliveryMode: group.deliveryMode,
      communityUrl: group.communityUrl ?? undefined,
      programId: group.programId ?? undefined,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    },
  });
  return toClassGroup(created);
};

export const updateClassGroup = async (
  prisma: PrismaService,
  tenantId: string,
  classGroupId: string,
  updates: Partial<ClassGroupEntity>
): Promise<ClassGroupEntity> => {
  const updated = await prisma.classGroup.update({
    where: { id: classGroupId, tenantId },
    data: {
      name: updates.name,
      subject: updates.subject,
      level: updates.level,
      defaultPricePerSession: updates.defaultPricePerSession,
      currency: updates.currency,
      schedulePattern: toJsonValue(updates.schedulePattern),
      status: updates.status,
      kind: updates.kind,
      lifecycle: updates.lifecycle,
      startAt: updates.startAt ?? undefined,
      endAt: updates.endAt ?? undefined,
      timezone: updates.timezone,
      capacity: updates.capacity ?? undefined,
      waitlistEnabled: updates.waitlistEnabled,
      deliveryMode: updates.deliveryMode,
      communityUrl: updates.communityUrl ?? undefined,
      programId: updates.programId ?? undefined,
      updatedAt: updates.updatedAt,
    },
  });
  return toClassGroup(updated);
};

export const findClassGroupById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string
): Promise<ClassGroupEntity | null> => {
  const row = await prisma.classGroup.findFirst({
    where: { id: classGroupId, tenantId, workspaceId },
  });
  return row ? toClassGroup(row) : null;
};

export const listClassGroups = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: ClassGroupListFilters,
  pagination: ListPagination
): Promise<{ items: ClassGroupEntity[]; total: number }> => {
  const where: any = { tenantId, workspaceId };

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.subject) {
    where.subject = filters.subject;
  }
  if (filters.level) {
    where.level = filters.level;
  }
  if (filters.kind) {
    where.kind = filters.kind;
  }
  if (filters.lifecycle) {
    where.lifecycle = filters.lifecycle;
  }
  if (filters.startAtFrom || filters.startAtTo) {
    where.startAt = {
      ...(filters.startAtFrom ? { gte: filters.startAtFrom } : {}),
      ...(filters.startAtTo ? { lte: filters.startAtTo } : {}),
    };
  }
  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { subject: { contains: filters.q, mode: "insensitive" } },
      { level: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.classGroup.findMany({
      where,
      orderBy: parseSort(
        filters.sort,
        ["createdAt", "updatedAt", "name", "subject", "level", "lifecycle", "startAt"],
        "updatedAt"
      ),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.classGroup.count({ where }),
  ]);

  return { items: items.map(toClassGroup), total };
};

export const listClassGroupsWithSchedulePattern = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string
): Promise<ClassGroupEntity[]> => {
  const rows = await prisma.classGroup.findMany({
    where: {
      tenantId,
      workspaceId,
      status: "ACTIVE",
      schedulePattern: { not: null },
    },
  });
  return rows.map(toClassGroup);
};
