import type { PrismaService } from "@corely/data";
import type { ClassGroupResourceEntity } from "../../domain/entities/classes.entities";
import { toClassGroupResource } from "./prisma.mappers";

export const listResourcesByClassGroup = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string
): Promise<ClassGroupResourceEntity[]> => {
  const rows = await prisma.classGroupResource.findMany({
    where: { tenantId, workspaceId, classGroupId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toClassGroupResource);
};

export const createResource = async (
  prisma: PrismaService,
  resource: ClassGroupResourceEntity
): Promise<ClassGroupResourceEntity> => {
  const row = await prisma.classGroupResource.create({
    data: {
      id: resource.id,
      tenantId: resource.tenantId,
      workspaceId: resource.workspaceId,
      classGroupId: resource.classGroupId,
      type: resource.type,
      title: resource.title,
      documentId: resource.documentId ?? undefined,
      url: resource.url ?? undefined,
      visibility: resource.visibility,
      sortOrder: resource.sortOrder,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    },
  });
  return toClassGroupResource(row);
};

export const updateResource = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  resourceId: string,
  updates: Partial<ClassGroupResourceEntity>
): Promise<ClassGroupResourceEntity> => {
  const row = await prisma.classGroupResource.update({
    where: { id: resourceId, tenantId, workspaceId },
    data: {
      type: updates.type,
      title: updates.title,
      documentId: updates.documentId ?? undefined,
      url: updates.url ?? undefined,
      visibility: updates.visibility,
      sortOrder: updates.sortOrder,
      updatedAt: updates.updatedAt,
    },
  });
  return toClassGroupResource(row);
};

export const deleteResource = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  resourceId: string
): Promise<void> => {
  await prisma.classGroupResource.delete({
    where: { id: resourceId, tenantId, workspaceId },
  });
};

export const reorderResources = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string,
  orderedIds: string[]
): Promise<void> => {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.classGroupResource.updateMany({
        where: {
          id,
          tenantId,
          workspaceId,
          classGroupId,
        },
        data: {
          sortOrder: index,
        },
      })
    )
  );
};

export const findResourceById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  resourceId: string
): Promise<ClassGroupResourceEntity | null> => {
  const row = await prisma.classGroupResource.findFirst({
    where: { id: resourceId, tenantId, workspaceId },
  });
  return row ? toClassGroupResource(row) : null;
};
