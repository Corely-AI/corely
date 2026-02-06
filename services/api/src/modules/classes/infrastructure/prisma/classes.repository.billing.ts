import type { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import type {
  ClassBillingInvoiceLinkEntity,
  ClassMonthlyBillingRunEntity,
} from "../../domain/entities/classes.entities";
import type { BillingPreviewFilters } from "../../application/ports/classes-repository.port";
import type { AttendanceBillingRow } from "../../domain/rules/billing.rules";
import { toBillingInvoiceLink, toBillingRun } from "./prisma.mappers";
import { formatInTimeZone } from "date-fns-tz";
import { BILLING_TIMEZONE } from "../../application/helpers/billing-period";

const toJsonValue = (value?: Record<string, unknown> | null): Prisma.InputJsonValue | undefined => {
  if (!value) {
    return undefined;
  }
  return value as Prisma.InputJsonValue;
};

export const listBillableAttendanceForMonth = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: BillingPreviewFilters
): Promise<AttendanceBillingRow[]> => {
  const rows = await prisma.classAttendance.findMany({
    where: {
      tenantId,
      workspaceId,
      billable: true,
      session: {
        status: "DONE",
        startsAt: {
          gte: filters.monthStart,
          lte: filters.monthEnd,
        },
        ...(filters.classGroupId ? { classGroupId: filters.classGroupId } : {}),
      },
      enrollment: {
        ...(filters.payerClientId ? { payerClientId: filters.payerClientId } : {}),
      },
    },
    select: {
      enrollment: {
        select: {
          payerClientId: true,
          priceOverridePerSession: true,
          classGroup: {
            select: {
              id: true,
              name: true,
              defaultPricePerSession: true,
              currency: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    payerClientId: row.enrollment.payerClientId,
    classGroupId: row.enrollment.classGroup.id,
    classGroupName: row.enrollment.classGroup.name,
    priceCents:
      row.enrollment.priceOverridePerSession ?? row.enrollment.classGroup.defaultPricePerSession,
    currency: row.enrollment.classGroup.currency,
  }));
};

export const listBillableScheduledForMonth = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  filters: BillingPreviewFilters
): Promise<AttendanceBillingRow[]> => {
  const sessions = await prisma.classSession.findMany({
    where: {
      tenantId,
      workspaceId,
      status: { in: ["PLANNED", "DONE"] },
      startsAt: {
        gte: filters.monthStart,
        lte: filters.monthEnd,
      },
      ...(filters.classGroupId ? { classGroupId: filters.classGroupId } : {}),
    },
    select: {
      startsAt: true,
      classGroupId: true,
      classGroup: {
        select: {
          id: true,
          name: true,
          defaultPricePerSession: true,
          currency: true,
        },
      },
    },
  });

  if (sessions.length === 0) {
    return [];
  }

  const classGroupIds = Array.from(new Set(sessions.map((session) => session.classGroupId)));

  const enrollments = await prisma.classEnrollment.findMany({
    where: {
      tenantId,
      workspaceId,
      classGroupId: { in: classGroupIds },
      isActive: true,
      ...(filters.payerClientId ? { payerClientId: filters.payerClientId } : {}),
    },
    select: {
      classGroupId: true,
      payerClientId: true,
      priceOverridePerSession: true,
      startDate: true,
      endDate: true,
    },
  });

  const enrollmentsByGroup = new Map<string, typeof enrollments>();
  for (const enrollment of enrollments) {
    const bucket = enrollmentsByGroup.get(enrollment.classGroupId);
    if (bucket) {
      bucket.push(enrollment);
    } else {
      enrollmentsByGroup.set(enrollment.classGroupId, [enrollment]);
    }
  }

  const rows: AttendanceBillingRow[] = [];
  for (const session of sessions) {
    const sessionDate = formatInTimeZone(session.startsAt, BILLING_TIMEZONE, "yyyy-MM-dd");
    const groupEnrollments = enrollmentsByGroup.get(session.classGroupId) ?? [];

    for (const enrollment of groupEnrollments) {
      const startDate = enrollment.startDate
        ? formatInTimeZone(enrollment.startDate, BILLING_TIMEZONE, "yyyy-MM-dd")
        : null;
      const endDate = enrollment.endDate
        ? formatInTimeZone(enrollment.endDate, BILLING_TIMEZONE, "yyyy-MM-dd")
        : null;

      if (startDate && startDate > sessionDate) {
        continue;
      }
      if (endDate && endDate < sessionDate) {
        continue;
      }

      rows.push({
        payerClientId: enrollment.payerClientId,
        classGroupId: session.classGroup.id,
        classGroupName: session.classGroup.name,
        priceCents: enrollment.priceOverridePerSession ?? session.classGroup.defaultPricePerSession,
        currency: session.classGroup.currency,
      });
    }
  }

  return rows;
};

export const findBillingRunByMonth = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  month: string
): Promise<ClassMonthlyBillingRunEntity | null> => {
  const row = await prisma.classMonthlyBillingRun.findFirst({
    where: { tenantId, workspaceId, month },
  });
  return row ? toBillingRun(row) : null;
};

export const listBillingRunsByMonths = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  months: string[]
): Promise<ClassMonthlyBillingRunEntity[]> => {
  if (months.length === 0) {
    return [];
  }
  const rows = await prisma.classMonthlyBillingRun.findMany({
    where: { tenantId, workspaceId, month: { in: months } },
  });
  return rows.map(toBillingRun);
};

export const findBillingRunById = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  billingRunId: string
): Promise<ClassMonthlyBillingRunEntity | null> => {
  const row = await prisma.classMonthlyBillingRun.findFirst({
    where: { id: billingRunId, tenantId, workspaceId },
  });
  return row ? toBillingRun(row) : null;
};

export const createBillingRun = async (
  prisma: PrismaService,
  run: ClassMonthlyBillingRunEntity
): Promise<ClassMonthlyBillingRunEntity> => {
  const row = await prisma.classMonthlyBillingRun.create({
    data: {
      id: run.id,
      tenantId: run.tenantId,
      workspaceId: run.workspaceId,
      month: run.month,
      billingMonthStrategy: run.billingMonthStrategy,
      billingBasis: run.billingBasis,
      billingSnapshot: toJsonValue(run.billingSnapshot),
      status: run.status,
      runId: run.runId,
      generatedAt: run.generatedAt ?? undefined,
      createdByUserId: run.createdByUserId,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    },
  });
  return toBillingRun(row);
};

export const updateBillingRun = async (
  prisma: PrismaService,
  tenantId: string,
  billingRunId: string,
  updates: Partial<ClassMonthlyBillingRunEntity>
): Promise<ClassMonthlyBillingRunEntity> => {
  const row = await prisma.classMonthlyBillingRun.update({
    where: { id: billingRunId, tenantId },
    data: {
      billingMonthStrategy: updates.billingMonthStrategy ?? undefined,
      billingBasis: updates.billingBasis ?? undefined,
      billingSnapshot: toJsonValue(updates.billingSnapshot),
      status: updates.status,
      generatedAt: updates.generatedAt ?? undefined,
      updatedAt: updates.updatedAt,
    },
  });
  return toBillingRun(row);
};

export const listBillingInvoiceLinks = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  billingRunId: string
): Promise<ClassBillingInvoiceLinkEntity[]> => {
  const rows = await prisma.classBillingInvoiceLink.findMany({
    where: { tenantId, workspaceId, billingRunId },
  });
  return rows.map(toBillingInvoiceLink);
};

export const findBillingInvoiceLinkByIdempotency = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  idempotencyKey: string
): Promise<ClassBillingInvoiceLinkEntity | null> => {
  const row = await prisma.classBillingInvoiceLink.findFirst({
    where: { tenantId, workspaceId, idempotencyKey },
  });
  return row ? toBillingInvoiceLink(row) : null;
};

export const createBillingInvoiceLink = async (
  prisma: PrismaService,
  link: ClassBillingInvoiceLinkEntity
): Promise<ClassBillingInvoiceLinkEntity> => {
  const row = await prisma.classBillingInvoiceLink.create({
    data: {
      id: link.id,
      tenantId: link.tenantId,
      workspaceId: link.workspaceId,
      billingRunId: link.billingRunId,
      payerClientId: link.payerClientId,
      invoiceId: link.invoiceId,
      idempotencyKey: link.idempotencyKey,
      createdAt: link.createdAt,
    },
  });
  return toBillingInvoiceLink(row);
};

export const isMonthLocked = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  month: string
): Promise<boolean> => {
  const row = await prisma.classMonthlyBillingRun.findFirst({
    where: {
      tenantId,
      workspaceId,
      month,
      status: { in: ["INVOICES_CREATED", "LOCKED"] },
    },
    select: { id: true },
  });
  return Boolean(row);
};
