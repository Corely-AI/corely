import type { PrismaService } from "@corely/data";
import type {
  ClassBillingInvoiceLinkEntity,
  ClassMonthlyBillingRunEntity,
} from "../../domain/entities/classes.entities";
import type { BillingPreviewFilters } from "../../application/ports/classes-repository.port";
import type { AttendanceBillingRow } from "../../domain/rules/billing.rules";
import { toBillingInvoiceLink, toBillingRun } from "./prisma.mappers";

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
