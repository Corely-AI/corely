import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "@corely/data";
import { TaxReportRepoPort } from "../../domain/ports";
import type { TaxReportEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxReportRepoAdapter extends TaxReportRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async listByStatus(
    tenantId: string,
    status: "upcoming" | "submitted"
  ): Promise<TaxReportEntity[]> {
    const where =
      status === "submitted"
        ? { tenantId, status: { in: ["SUBMITTED", "PAID", "NIL", "ARCHIVED"] as any } }
        : { tenantId, status: { in: ["UPCOMING", "OPEN", "OVERDUE"] as any } };

    const rows = await this.prisma.taxReport.findMany({
      where,
      orderBy: { dueDate: "asc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(tenantId: string, id: string): Promise<TaxReportEntity | null> {
    const row = await this.prisma.taxReport.findFirst({
      where: { id, tenantId },
      include: { lines: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async markSubmitted(tenantId: string, id: string, submittedAt: Date): Promise<TaxReportEntity> {
    const updated = await this.prisma.taxReport.updateMany({
      where: { id, tenantId },
      data: { status: "SUBMITTED" as any, submittedAt, updatedAt: new Date() },
    });
    if (updated.count === 0) {
      throw new Error("Report not found for tenant");
    }
    const refreshed = await this.prisma.taxReport.findUnique({ where: { id } });
    if (!refreshed) {
      throw new Error("Report not found after update");
    }
    return this.toDomain(refreshed);
  }

  async submitReport(params: {
    tenantId: string;
    reportId: string;
    submittedAt: Date;
    submissionReference: string;
    submissionNotes?: string | null;
  }): Promise<TaxReportEntity> {
    const updated = await this.prisma.taxReport.updateMany({
      where: { id: params.reportId, tenantId: params.tenantId },
      data: {
        status: "SUBMITTED" as any,
        submittedAt: params.submittedAt,
        submissionReference: params.submissionReference,
        submissionNotes: params.submissionNotes ?? null,
        updatedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new Error("Report not found for tenant");
    }
    const refreshed = await this.prisma.taxReport.findUnique({ where: { id: params.reportId } });
    if (!refreshed) {
      throw new Error("Report not found after update");
    }
    return this.toDomain(refreshed);
  }

  async markPaid(params: {
    tenantId: string;
    reportId: string;
    paidAt: Date;
    amountCents: number;
    method: string;
    proofDocumentId?: string | null;
  }): Promise<TaxReportEntity> {
    const current = await this.prisma.taxReport.findFirst({
      where: { id: params.reportId, tenantId: params.tenantId },
    });
    if (!current) {
      throw new Error("Report not found for tenant");
    }
    const mergedMeta = {
      ...(current as any).meta,
      payment: {
        paidAt: params.paidAt.toISOString(),
        method: params.method,
        amountCents: params.amountCents,
        proofDocumentId: params.proofDocumentId ?? null,
      },
    };
    const updated = await this.prisma.taxReport.updateMany({
      where: { id: params.reportId, tenantId: params.tenantId },
      data: {
        status: "PAID" as any,
        amountFinalCents: params.amountCents,
        meta: mergedMeta as any,
        updatedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new Error("Report not found for tenant");
    }
    const refreshed = await this.prisma.taxReport.findUnique({ where: { id: params.reportId } });
    if (!refreshed) {
      throw new Error("Report not found after update");
    }
    return this.toDomain(refreshed);
  }

  async updateMeta(params: {
    tenantId: string;
    reportId: string;
    meta: Record<string, unknown>;
  }): Promise<TaxReportEntity> {
    const updated = await this.prisma.taxReport.updateMany({
      where: { id: params.reportId, tenantId: params.tenantId },
      data: {
        meta: params.meta as any,
        updatedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new Error("Report not found for tenant");
    }
    const refreshed = await this.prisma.taxReport.findUnique({ where: { id: params.reportId } });
    if (!refreshed) {
      throw new Error("Report not found after update");
    }
    return this.toDomain(refreshed);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.prisma.taxReport.deleteMany({ where: { id, tenantId } });
  }

  async listByPeriodRange(
    tenantId: string,
    type: string,
    start: Date,
    end: Date
  ): Promise<TaxReportEntity[]> {
    const rows = await this.prisma.taxReport.findMany({
      where: {
        tenantId,
        type: type as any,
        periodStart: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { periodStart: "asc" },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async upsertByPeriod(input: {
    tenantId: string;
    type: string;
    group: string;
    periodLabel: string;
    periodStart: Date;
    periodEnd: Date;
    dueDate: Date;
    status: string;
    amountFinalCents?: number | null;
    submissionReference?: string | null;
    submissionNotes?: string | null;
    archivedReason?: string | null;
    submittedAt?: Date | null;
    pdfStorageKey?: string | null;
  }): Promise<TaxReportEntity> {
    const row = await this.prisma.taxReport.upsert({
      where: {
        tenantId_type_periodStart_periodEnd: {
          tenantId: input.tenantId,
          type: input.type as any,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      },
      create: {
        id: randomUUID(),
        tenantId: input.tenantId,
        type: input.type as any,
        group: input.group as any,
        periodLabel: input.periodLabel,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        dueDate: input.dueDate,
        status: input.status as any,
        amountEstimatedCents: null,
        amountFinalCents: input.amountFinalCents ?? null,
        currency: "EUR",
        submittedAt: input.submittedAt ?? null,
        submissionReference: input.submissionReference ?? null,
        submissionNotes: input.submissionNotes ?? null,
        archivedReason: input.archivedReason ?? null,
        pdfStorageKey: input.pdfStorageKey ?? null,
      },
      update: {
        status: input.status as any,
        amountFinalCents: input.amountFinalCents ?? null,
        submittedAt: input.submittedAt ?? null,
        submissionReference: input.submissionReference ?? null,
        submissionNotes: input.submissionNotes ?? null,
        archivedReason: input.archivedReason ?? null,
        pdfStorageKey: input.pdfStorageKey ?? undefined, // Only update if provided? wrapper function passes null defaults.
        // Actually, if input.pdfStorageKey is passed (even null), we might overwrite.
        // Logic: if undefined, don't update. if null, clear it?
        // The input interface has optional pdfStorageKey.
        // Let's use `input.pdfStorageKey` directly, but if undefined we might want to skip.
        // The previous code had `?? null` to force nulls.
        // If I use `input.pdfStorageKey ?? undefined`, then explicit nulls become null, undefined becomes undefined (skip update in prisma).
        // But `??` coalesces null and undefined.
        // `input.pdfStorageKey === undefined ? undefined : input.pdfStorageKey` is safer.
        // However, Prisma `create` requires a value (or null). `update` allows undefined to skip.
        updatedAt: new Date(),
      },
    });

    return this.toDomain(row);
  }

  async seedDefaultReports(tenantId: string): Promise<void> {
    // We remove the early 'return' check so we can backfill missing reports (like past year)
    // if the user already has some reports. skipDuplicates handles the safety.

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const pastYear = currentYear - 1;

    // Current Quarter calculation
    const quarterStart = new Date(Date.UTC(currentYear, Math.floor(now.getUTCMonth() / 3) * 3, 1));
    const quarterEnd = new Date(
      Date.UTC(quarterStart.getUTCFullYear(), quarterStart.getUTCMonth() + 3, 0)
    );

    // Calculate due date: 10 days after quarter ends
    const quarterDue = new Date(quarterEnd);
    quarterDue.setUTCDate(quarterDue.getUTCDate() + 10);

    const reports: any[] = [
      {
        id: randomUUID(),
        tenantId,
        type: "VAT_ADVANCE",
        group: "ADVANCE_VAT",
        periodLabel: `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${currentYear}`,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        dueDate: quarterDue,
        status: "OPEN",
        amountEstimatedCents: null,
        currency: "EUR",
      },
      // Past Year (2025)
      {
        id: randomUUID(),
        tenantId,
        type: "VAT_ANNUAL",
        group: "ANNUAL_REPORT",
        periodLabel: `${pastYear}`,
        periodStart: new Date(Date.UTC(pastYear, 0, 1)),
        periodEnd: new Date(Date.UTC(pastYear, 11, 31)),
        dueDate: new Date(Date.UTC(currentYear, 4, 31)), // May 31 of current year
        status: "OPEN",
        amountEstimatedCents: null,
        currency: "EUR",
      },
      // Current Year (2026)
      {
        id: randomUUID(),
        tenantId,
        type: "VAT_ANNUAL",
        group: "ANNUAL_REPORT",
        periodLabel: `${currentYear}`,
        periodStart: new Date(Date.UTC(currentYear, 0, 1)),
        periodEnd: new Date(Date.UTC(currentYear, 11, 31)),
        dueDate: new Date(Date.UTC(currentYear + 1, 4, 31)), // May 31 of next year
        status: "UPCOMING",
        amountEstimatedCents: null,
        currency: "EUR",
      },
    ];

    await this.prisma.taxReport.createMany({
      data: reports,
      skipDuplicates: true,
    });
  }

  private toDomain(model: any): TaxReportEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      type: model.type,
      group: model.group,
      periodLabel: model.periodLabel,
      periodStart: model.periodStart,
      periodEnd: model.periodEnd,
      dueDate: model.dueDate,
      status: model.status,
      amountEstimatedCents: model.amountEstimatedCents ?? null,
      amountFinalCents: model.amountFinalCents ?? null,
      currency: model.currency,
      submittedAt: model.submittedAt,
      submissionReference: model.submissionReference ?? null,
      submissionNotes: model.submissionNotes ?? null,
      archivedReason: model.archivedReason ?? null,
      pdfStorageKey: model.pdfStorageKey ?? null,
      pdfGeneratedAt: model.pdfGeneratedAt ?? null,
      meta: (model.meta as any) ?? null,
      lines: model.lines
        ? model.lines.map((l: any) => ({
            section: l.section,
            label: l.label,
            netAmountCents: l.netAmountCents,
            taxAmountCents: l.taxAmountCents,
            meta: l.meta,
          }))
        : undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
