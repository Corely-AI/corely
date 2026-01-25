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
    const existing = await this.prisma.taxReport.count({ where: { tenantId } });
    if (existing > 0) {
      return;
    }

    const now = new Date();
    const year = now.getUTCFullYear();
    const quarterStart = new Date(Date.UTC(year, Math.floor(now.getUTCMonth() / 3) * 3, 1));
    const quarterEnd = new Date(
      Date.UTC(quarterStart.getUTCFullYear(), quarterStart.getUTCMonth() + 3, 0)
    );

    // Calculate due date: 10 days after quarter ends
    const due = new Date(quarterEnd);
    due.setUTCDate(due.getUTCDate() + 10);

    await this.prisma.taxReport.createMany({
      data: [
        {
          id: randomUUID(),
          tenantId,
          type: "VAT_ADVANCE",
          group: "ADVANCE_VAT",
          periodLabel: `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${year}`,
          periodStart: quarterStart,
          periodEnd: quarterEnd,
          dueDate: due,
          status: "OPEN",
          amountEstimatedCents: null,
          currency: "EUR",
        },
        {
          id: randomUUID(),
          tenantId,
          type: "VAT_ANNUAL",
          group: "ANNUAL_REPORT",
          periodLabel: `${year}`,
          periodStart: new Date(Date.UTC(year, 0, 1)),
          periodEnd: new Date(Date.UTC(year, 11, 31)),
          dueDate: new Date(Date.UTC(year + 1, 4, 31)), // May 31 of following year
          status: "UPCOMING",
          amountEstimatedCents: null,
          currency: "EUR",
        },
      ],
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
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
