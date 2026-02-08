import { Injectable } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@prisma/client";
import { PrismaService } from "@corely/data";
import type {
  ClaimReminderOptions,
  InvoiceReminderStatePort,
  InvoiceReminderStateRecord,
  InitReminderStateInput,
} from "../../application/ports/invoice-reminder-state.port";

type PrismaOrTx = PrismaService | PrismaClient;

@Injectable()
export class PrismaInvoiceReminderStateAdapter implements InvoiceReminderStatePort {
  constructor(private readonly prisma: PrismaService) {}

  async findByInvoice(
    tenantId: string,
    invoiceId: string
  ): Promise<InvoiceReminderStateRecord | null> {
    const row = await this.prisma.invoiceReminderState.findUnique({
      where: { tenantId_invoiceId: { tenantId, invoiceId } },
    });
    return row ? this.toRecord(row) : null;
  }

  async upsertInitialState(input: InitReminderStateInput): Promise<InvoiceReminderStateRecord> {
    const row = await this.prisma.invoiceReminderState.upsert({
      where: { tenantId_invoiceId: { tenantId: input.tenantId, invoiceId: input.invoiceId } },
      create: {
        id: input.id,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId,
        invoiceId: input.invoiceId,
        remindersSent: 0,
        nextReminderAt: input.nextReminderAt,
        lastReminderAt: null,
      },
      update: {},
    });
    return this.toRecord(row);
  }

  async claimDueReminders(
    tenantId: string,
    workspaceId: string,
    now: Date,
    options: ClaimReminderOptions
  ): Promise<InvoiceReminderStateRecord[]> {
    const lockExpiresAt = new Date(now.getTime() - options.lockTtlMs);
    const rows = await this.prisma.$transaction(async (tx: PrismaOrTx) => {
      const claimed = await tx.$queryRaw<InvoiceReminderStateRecord[]>(
        Prisma.sql`
          WITH due AS (
            SELECT r."id"
            FROM "billing"."InvoiceReminderState" r
            JOIN "billing"."Invoice" i
              ON i."id" = r."invoiceId" AND i."tenantId" = r."tenantId"
            WHERE r."tenantId" = ${tenantId}
              AND r."workspaceId" = ${workspaceId}
              AND r."nextReminderAt" IS NOT NULL
              AND r."nextReminderAt" <= ${now}
              AND (r."lockedAt" IS NULL OR r."lockedAt" < ${lockExpiresAt})
              AND i."status" NOT IN ('PAID', 'CANCELED')
            ORDER BY r."nextReminderAt" ASC
            LIMIT ${options.limit}
            FOR UPDATE SKIP LOCKED
          )
          UPDATE "billing"."InvoiceReminderState" r
          SET "lockedAt" = ${now}, "lockedBy" = ${options.lockId}
          FROM due
          WHERE r."id" = due."id"
          RETURNING
            r."id",
            r."tenantId",
            r."workspaceId",
            r."invoiceId",
            r."remindersSent",
            r."nextReminderAt",
            r."lastReminderAt",
            r."lockedAt",
            r."lockedBy"
        `
      );
      return claimed.map((row) => this.toRecord(row));
    });

    return rows;
  }

  async releaseLock(tenantId: string, reminderId: string, lockId: string): Promise<void> {
    await this.prisma.invoiceReminderState.updateMany({
      where: { tenantId, id: reminderId, lockedBy: lockId },
      data: { lockedAt: null, lockedBy: null },
    });
  }

  async markReminderSent(params: {
    tenantId: string;
    reminderId: string;
    lockId: string;
    remindersSent: number;
    lastReminderAt: Date;
    nextReminderAt: Date | null;
  }): Promise<void> {
    await this.prisma.invoiceReminderState.updateMany({
      where: { tenantId: params.tenantId, id: params.reminderId, lockedBy: params.lockId },
      data: {
        remindersSent: params.remindersSent,
        lastReminderAt: params.lastReminderAt,
        nextReminderAt: params.nextReminderAt,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async markStopped(params: {
    tenantId: string;
    reminderId: string;
    lockId: string;
  }): Promise<void> {
    await this.prisma.invoiceReminderState.updateMany({
      where: { tenantId: params.tenantId, id: params.reminderId, lockedBy: params.lockId },
      data: {
        nextReminderAt: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  private toRecord(row: any): InvoiceReminderStateRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      workspaceId: row.workspaceId,
      invoiceId: row.invoiceId,
      remindersSent: Number(row.remindersSent ?? 0),
      nextReminderAt: row.nextReminderAt ? new Date(row.nextReminderAt) : null,
      lastReminderAt: row.lastReminderAt ? new Date(row.lastReminderAt) : null,
      lockedAt: row.lockedAt ? new Date(row.lockedAt) : null,
      lockedBy: row.lockedBy ?? null,
    };
  }
}
