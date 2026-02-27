import type { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import type {
  ClassBillingInvoiceLinkEntity,
  ClassMonthlyBillingRunEntity,
} from "../../domain/entities/classes.entities";
import type {
  BillingInvoiceSendProgress,
  BillingPreviewFilters,
  InvoiceRecipientEmailLookup,
} from "../../application/ports/classes-repository.port";
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
  const rows = (await prisma.classAttendance.findMany({
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
        payerClientId: filters.payerClientId ?? undefined,
      },
    } as any,
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
  })) as any[];

  return rows.map((row: any) => ({
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

  const enrollments = (await prisma.classEnrollment.findMany({
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
    } as any,
  })) as any[];

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
        payerClientId: (enrollment as any).payerClientId,
        classGroupId: session.classGroup.id,
        classGroupName: session.classGroup.name,
        priceCents:
          (enrollment as any).priceOverridePerSession ?? session.classGroup.defaultPricePerSession,
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
  void workspaceId;
  const row = await prisma.classMonthlyBillingRun.findFirst({
    where: { tenantId, month },
  });
  return row ? toBillingRun(row) : null;
};

export const listBillingRunsByMonths = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  months: string[]
): Promise<ClassMonthlyBillingRunEntity[]> => {
  void workspaceId;
  if (months.length === 0) {
    return [];
  }
  const rows = await prisma.classMonthlyBillingRun.findMany({
    where: { tenantId, month: { in: months } },
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
    } as any,
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
    } as any,
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

export const listBillingInvoiceLinksByEnrollment = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  enrollmentId: string
): Promise<ClassBillingInvoiceLinkEntity[]> => {
  const rows = await prisma.classBillingInvoiceLink.findMany({
    where: { tenantId, workspaceId, enrollmentId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toBillingInvoiceLink);
};

export const getInvoiceStatusesByIds = async (
  prisma: PrismaService,
  workspaceId: string,
  invoiceIds: string[]
): Promise<Record<string, "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED">> => {
  const uniqueIds = Array.from(new Set(invoiceIds)).filter(Boolean);
  if (uniqueIds.length === 0) {
    return {};
  }

  const rows = await prisma.invoice.findMany({
    where: {
      tenantId: workspaceId,
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      status: true,
    },
  });

  return rows.reduce<Record<string, "DRAFT" | "ISSUED" | "SENT" | "PAID" | "CANCELED">>(
    (acc, row) => {
      acc[row.id] = row.status;
      return acc;
    },
    {}
  );
};

export const getInvoiceRecipientEmailsByIds = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  invoiceIds: string[]
): Promise<InvoiceRecipientEmailLookup[]> => {
  const uniqueIds = Array.from(new Set(invoiceIds)).filter(Boolean);
  if (uniqueIds.length === 0) {
    return [];
  }

  const rows = await prisma.invoice.findMany({
    where: {
      tenantId: workspaceId,
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      billToEmail: true,
      customerPartyId: true,
    },
  });

  const idsWithMissingEmail = rows.filter((row) => !row.billToEmail?.trim()).map((row) => row.id);

  const fallbackEmails = new Map<string, string>();

  if (idsWithMissingEmail.length > 0) {
    const partyIds = Array.from(
      new Set(
        rows
          .filter((row) => idsWithMissingEmail.includes(row.id))
          .map((row) => row.customerPartyId)
          .filter((partyId): partyId is string => Boolean(partyId))
      )
    );

    const parties = await prisma.party.findMany({
      where: {
        tenantId,
        id: { in: partyIds },
      },
      select: {
        id: true,
        contactPoints: {
          where: { type: "EMAIL" },
          select: { value: true, isPrimary: true },
        },
      },
    });

    for (const party of parties) {
      const email =
        party.contactPoints.find((cp) => cp.isPrimary)?.value || party.contactPoints[0]?.value;
      if (email) {
        fallbackEmails.set(party.id, email);
      }
    }
  }

  return rows.map((row) => {
    const email = row.billToEmail?.trim()
      ? row.billToEmail.trim()
      : fallbackEmails.get(row.customerPartyId) || null;
    return {
      invoiceId: row.id,
      email,
    };
  });
};

export const getBillingInvoiceSendProgress = async (
  prisma: PrismaService,
  workspaceId: string,
  invoiceIds: string[],
  sentAfter: Date,
  expectedInvoiceCount: number
): Promise<BillingInvoiceSendProgress> => {
  const uniqueInvoiceIds = Array.from(new Set(invoiceIds));
  const normalizedExpected = Math.max(expectedInvoiceCount, uniqueInvoiceIds.length, 0);

  if (normalizedExpected === 0) {
    return {
      expectedInvoiceCount: 0,
      processedInvoiceCount: 0,
      pendingCount: 0,
      queuedCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      delayedCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      isComplete: true,
      hasFailures: false,
    };
  }

  if (uniqueInvoiceIds.length === 0) {
    return {
      expectedInvoiceCount: normalizedExpected,
      processedInvoiceCount: 0,
      pendingCount: normalizedExpected,
      queuedCount: 0,
      sentCount: 0,
      deliveredCount: 0,
      delayedCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      isComplete: false,
      hasFailures: false,
    };
  }

  const deliveries = await prisma.invoiceEmailDelivery.findMany({
    where: {
      tenantId: workspaceId,
      invoiceId: { in: uniqueInvoiceIds },
      createdAt: { gte: sentAfter },
    },
    orderBy: [{ invoiceId: "asc" }, { createdAt: "desc" }],
    select: {
      invoiceId: true,
      status: true,
    },
  });

  const latestStatusByInvoice = new Map<string, string>();
  for (const delivery of deliveries) {
    if (!latestStatusByInvoice.has(delivery.invoiceId)) {
      latestStatusByInvoice.set(delivery.invoiceId, delivery.status);
    }
  }

  let queuedCount = 0;
  let sentCount = 0;
  let deliveredCount = 0;
  let delayedCount = 0;
  let failedCount = 0;
  let bouncedCount = 0;

  for (const status of latestStatusByInvoice.values()) {
    switch (status) {
      case "QUEUED":
        queuedCount += 1;
        break;
      case "SENT":
        sentCount += 1;
        break;
      case "DELIVERED":
        deliveredCount += 1;
        break;
      case "DELAYED":
        delayedCount += 1;
        break;
      case "FAILED":
        failedCount += 1;
        break;
      case "BOUNCED":
        bouncedCount += 1;
        break;
      default:
        break;
    }
  }

  const processedInvoiceCount = latestStatusByInvoice.size;
  const pendingCount = Math.max(normalizedExpected - processedInvoiceCount, 0);
  const isComplete = pendingCount === 0 && queuedCount === 0;

  return {
    expectedInvoiceCount: normalizedExpected,
    processedInvoiceCount,
    pendingCount,
    queuedCount,
    sentCount,
    deliveredCount,
    delayedCount,
    failedCount,
    bouncedCount,
    isComplete,
    hasFailures: failedCount > 0 || bouncedCount > 0,
  };
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
      billingRunId: link.billingRunId ?? null,
      enrollmentId: link.enrollmentId ?? null,
      payerClientId: link.payerClientId,
      classGroupId: link.classGroupId ?? null,
      invoiceId: link.invoiceId,
      idempotencyKey: link.idempotencyKey,
      purpose: link.purpose,
      createdAt: link.createdAt,
    } as any,
  });
  return toBillingInvoiceLink(row);
};

export const deleteBillingInvoiceLinks = async (
  prisma: PrismaService,
  tenantId: string,
  workspaceId: string,
  billingRunId: string
): Promise<void> => {
  await prisma.classBillingInvoiceLink.deleteMany({
    where: { tenantId, workspaceId, billingRunId },
  });
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
      status: "LOCKED",
    },
    select: { id: true },
  });
  return Boolean(row);
};
