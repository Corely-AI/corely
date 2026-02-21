import type { PrismaService } from "@corely/data";
import type { ClassEnrollmentEntity } from "../../domain/entities/classes.entities";
import type {
  EnrollmentListFilters,
  ListPagination,
} from "../../application/ports/classes-repository.port";
import { toClassEnrollment } from "./prisma.mappers";
import { parseSort } from "./classes.repository.utils";

export const upsertEnrollment = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  classGroupId: string,
  studentClientId: string,
  data: ClassEnrollmentEntity
): Promise<ClassEnrollmentEntity> => {
  const row = await prisma.classEnrollment.upsert({
    where: {
      tenantId_classGroupId_studentClientId: {
        tenantId,
        classGroupId,
        studentClientId,
      },
    },
    update: {
      payerClientId: data.payerClientId,
      payerPartyId: data.payerPartyId ?? undefined,
      status: data.status,
      seatType: data.seatType,
      source: data.source,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      isActive: data.isActive,
      priceOverridePerSession: data.priceOverridePerSession ?? undefined,
      priceCents: data.priceCents ?? undefined,
      currency: data.currency ?? undefined,
      discountCents: data.discountCents ?? undefined,
      discountLabel: data.discountLabel ?? undefined,
      placementLevel: data.placementLevel ?? undefined,
      placementGoal: data.placementGoal ?? undefined,
      placementNote: data.placementNote ?? undefined,
      updatedAt: data.updatedAt,
    },
    create: {
      id: data.id,
      tenantId,
      workspaceId,
      classGroupId,
      studentClientId,
      payerClientId: data.payerClientId,
      payerPartyId: data.payerPartyId ?? undefined,
      status: data.status,
      seatType: data.seatType,
      source: data.source,
      startDate: data.startDate ?? undefined,
      endDate: data.endDate ?? undefined,
      isActive: data.isActive,
      priceOverridePerSession: data.priceOverridePerSession ?? undefined,
      priceCents: data.priceCents ?? undefined,
      currency: data.currency ?? undefined,
      discountCents: data.discountCents ?? undefined,
      discountLabel: data.discountLabel ?? undefined,
      placementLevel: data.placementLevel ?? undefined,
      placementGoal: data.placementGoal ?? undefined,
      placementNote: data.placementNote ?? undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    },
  });
  return toClassEnrollment(row);
};

export const updateEnrollment = async (
  prisma: PrismaService,
  tenantId: string,
  enrollmentId: string,
  updates: Partial<ClassEnrollmentEntity>
): Promise<ClassEnrollmentEntity> => {
  const row = await prisma.classEnrollment.update({
    where: { id: enrollmentId, tenantId },
    data: {
      payerClientId: updates.payerClientId,
      payerPartyId: updates.payerPartyId ?? undefined,
      status: updates.status,
      seatType: updates.seatType,
      source: updates.source,
      startDate: updates.startDate ?? undefined,
      endDate: updates.endDate ?? undefined,
      isActive: updates.isActive,
      priceOverridePerSession: updates.priceOverridePerSession ?? undefined,
      priceCents: updates.priceCents ?? undefined,
      currency: updates.currency ?? undefined,
      discountCents: updates.discountCents ?? undefined,
      discountLabel: updates.discountLabel ?? undefined,
      placementLevel: updates.placementLevel ?? undefined,
      placementGoal: updates.placementGoal ?? undefined,
      placementNote: updates.placementNote ?? undefined,
      updatedAt: updates.updatedAt,
    },
  });
  return toClassEnrollment(row);
};

export const findEnrollmentById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<ClassEnrollmentEntity | null> => {
  const row = await prisma.classEnrollment.findFirst({
    where: { id: enrollmentId, tenantId, workspaceId },
  });
  return row ? toClassEnrollment(row) : null;
};

export const listEnrollments = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: EnrollmentListFilters,
  pagination: ListPagination
): Promise<{ items: ClassEnrollmentEntity[]; total: number }> => {
  const where: any = { tenantId, workspaceId };
  if (filters.classGroupId) {
    where.classGroupId = filters.classGroupId;
  }
  if (filters.studentClientId) {
    where.studentClientId = filters.studentClientId;
  }
  if (filters.payerClientId) {
    where.payerClientId = filters.payerClientId;
  }
  if (filters.payerPartyId) {
    where.payerPartyId = filters.payerPartyId;
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.seatType) {
    where.seatType = filters.seatType;
  }
  if (typeof filters.isActive === "boolean") {
    where.isActive = filters.isActive;
  }
  if (filters.q) {
    where.OR = [
      { studentClientId: { contains: filters.q, mode: "insensitive" } },
      { payerClientId: { contains: filters.q, mode: "insensitive" } },
      { discountLabel: { contains: filters.q, mode: "insensitive" } },
      { placementLevel: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.classEnrollment.findMany({
      where,
      orderBy: parseSort(
        filters.sort,
        ["createdAt", "updatedAt", "status", "seatType"],
        "createdAt"
      ),
      skip: (pagination.page - 1) * pagination.pageSize,
      take: pagination.pageSize,
    }),
    prisma.classEnrollment.count({ where }),
  ]);

  return { items: items.map(toClassEnrollment), total };
};
