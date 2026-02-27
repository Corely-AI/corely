import type { PrismaService } from "@corely/data";
import type { ClassGroupInstructorEntity } from "../../domain/entities/classes.entities";
import { toClassGroupInstructor } from "./prisma.mappers";

export const listClassGroupInstructors = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string
): Promise<ClassGroupInstructorEntity[]> => {
  const rows = await prisma.classGroupInstructor.findMany({
    where: { tenantId, workspaceId, classGroupId },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toClassGroupInstructor);
};

export const replaceClassGroupInstructors = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string,
  members: ClassGroupInstructorEntity[]
): Promise<ClassGroupInstructorEntity[]> => {
  await prisma.$transaction(async (tx) => {
    await tx.classGroupInstructor.deleteMany({
      where: { tenantId, workspaceId, classGroupId },
    });

    if (members.length > 0) {
      await tx.classGroupInstructor.createMany({
        data: members.map((member) => ({
          id: member.id,
          tenantId,
          workspaceId,
          classGroupId,
          partyId: member.partyId,
          role: member.role,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        })),
      });
    }
  });

  return listClassGroupInstructors(prisma, tenantId, workspaceId, classGroupId);
};
