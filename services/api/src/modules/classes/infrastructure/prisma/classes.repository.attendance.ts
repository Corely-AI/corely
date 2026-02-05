import type { PrismaService } from "@corely/data";
import type { ClassAttendanceEntity } from "../../domain/entities/classes.entities";
import { toClassAttendance } from "./prisma.mappers";

export const listAttendanceBySession = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  sessionId: string
): Promise<ClassAttendanceEntity[]> => {
  const rows = await prisma.classAttendance.findMany({
    where: { tenantId, workspaceId, sessionId },
  });
  return rows.map(toClassAttendance);
};

export const bulkUpsertAttendance = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  sessionId: string,
  items: ClassAttendanceEntity[]
): Promise<ClassAttendanceEntity[]> => {
  const rows = await prisma.$transaction(
    items.map((item) =>
      prisma.classAttendance.upsert({
        where: {
          tenantId_sessionId_enrollmentId: {
            tenantId,
            sessionId,
            enrollmentId: item.enrollmentId,
          },
        },
        update: {
          status: item.status,
          billable: item.billable,
          note: item.note ?? undefined,
          updatedAt: item.updatedAt,
        },
        create: {
          id: item.id,
          tenantId,
          workspaceId,
          sessionId,
          enrollmentId: item.enrollmentId,
          status: item.status,
          billable: item.billable,
          note: item.note ?? undefined,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        },
      })
    )
  );

  return rows.map(toClassAttendance);
};
