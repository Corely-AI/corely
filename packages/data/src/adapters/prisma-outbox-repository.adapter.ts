import { Injectable } from "@nestjs/common";
import type { OutboxEvent as PrismaOutboxEvent } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { getPrismaClient } from "../uow/prisma-unit-of-work.adapter";
import type { TransactionContext } from "@corely/kernel";

export interface OutboxEventData {
  eventType: string;
  payload: unknown;
  tenantId: string;
  correlationId?: string;
  availableAt?: Date;
}

export interface OutboxClaimOptions {
  limit: number;
  workerId: string;
  leaseDurationMs: number;
}

export interface OutboxQueueStats {
  duePendingCount: number;
  oldestDuePendingAgeMs: number | null;
}

export interface OutboxMarkFailedOptions {
  workerId: string;
  error: string;
  retryable?: boolean;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  retryJitterMs?: number;
}

export interface OutboxMarkFailedResult {
  outcome: "retried" | "failed" | "skipped";
  attempts?: number;
  nextAvailableAt?: Date;
}

/**
 * OutboxRepository for worker polling use cases.
 * This is separate from OutboxPort which is used by application layer.
 */
function safeParsePayload(payloadJson: string): unknown {
  try {
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

@Injectable()
export class OutboxRepository {
  private readonly defaultMaxAttempts = 3;
  private readonly defaultBaseDelayMs = 5000;
  private readonly defaultMaxDelayMs = 120000;
  private readonly defaultJitterMs = 250;

  constructor(private readonly prisma: PrismaService) {}

  async enqueue(data: OutboxEventData, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.outboxEvent.create({
      data: {
        tenantId: data.tenantId,
        eventType: data.eventType,
        payloadJson: JSON.stringify(data.payload ?? {}),
        correlationId: data.correlationId ?? null,
        availableAt: data.availableAt ?? new Date(),
      },
    });
  }

  async fetchPending(limit: number = 10) {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    return events.map((event: PrismaOutboxEvent) => ({
      ...event,
      payload: safeParsePayload(event.payloadJson ?? "{}"),
    }));
  }

  async claimPending(options: OutboxClaimOptions) {
    const now = new Date();
    const lockUntil = new Date(now.getTime() + Math.max(1, options.leaseDurationMs));

    const claimed = await this.prisma.$transaction(async (tx) => {
      return tx.$queryRaw<PrismaOutboxEvent[]>`
        WITH candidates AS (
          SELECT e."id"
          FROM "workflow"."OutboxEvent" e
          WHERE (
            (
              e."status" = 'PENDING'
              AND e."availableAt" <= ${now}
            )
            OR (
              e."status" = 'PROCESSING'
              AND e."lockedUntil" IS NOT NULL
              AND e."lockedUntil" < ${now}
            )
          )
          ORDER BY e."availableAt" ASC, e."createdAt" ASC
          LIMIT ${Math.max(1, options.limit)}
          FOR UPDATE SKIP LOCKED
        )
        UPDATE "workflow"."OutboxEvent" e
        SET
          "status" = 'PROCESSING',
          "lockedBy" = ${options.workerId},
          "lockedUntil" = ${lockUntil},
          "updatedAt" = ${now}
        FROM candidates
        WHERE e."id" = candidates."id"
        RETURNING e.*
      `;
    });

    return claimed.map((event) => ({
      ...event,
      payload: safeParsePayload(event.payloadJson ?? "{}"),
    }));
  }

  async extendLease(eventId: string, workerId: string, leaseDurationMs: number): Promise<boolean> {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + Math.max(1, leaseDurationMs));
    const updated = await this.prisma.outboxEvent.updateMany({
      where: {
        id: eventId,
        status: "PROCESSING",
        lockedBy: workerId,
      },
      data: { lockedUntil, updatedAt: now },
    });
    return updated.count > 0;
  }

  async markSent(id: string, workerId: string): Promise<boolean> {
    const now = new Date();
    const updated = await this.prisma.outboxEvent.updateMany({
      where: {
        id,
        status: "PROCESSING",
        lockedBy: workerId,
      },
      data: {
        status: "SENT",
        lockedBy: null,
        lockedUntil: null,
        lastError: null,
        updatedAt: now,
      },
    });
    return updated.count > 0;
  }

  async markFailed(id: string, options: OutboxMarkFailedOptions): Promise<OutboxMarkFailedResult> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.outboxEvent.findUnique({
        where: { id },
        select: {
          attempts: true,
          status: true,
          lockedBy: true,
        },
      });
      if (!current) {
        return { outcome: "skipped" as const };
      }
      if (current.status !== "PROCESSING" || current.lockedBy !== options.workerId) {
        return { outcome: "skipped" as const };
      }

      const nextAttempts = current.attempts + 1;
      const maxAttempts = options.maxAttempts ?? this.defaultMaxAttempts;
      const retryable = options.retryable ?? true;
      const now = new Date();
      const exhausted = nextAttempts >= maxAttempts;
      const shouldRetry = retryable && !exhausted;

      if (!shouldRetry) {
        await tx.outboxEvent.update({
          where: { id },
          data: {
            status: "FAILED",
            attempts: nextAttempts,
            lastError: options.error.slice(0, 2000),
            lockedBy: null,
            lockedUntil: null,
            updatedAt: now,
          },
        });
        return { outcome: "failed" as const, attempts: nextAttempts };
      }

      const retryBaseDelayMs = options.retryBaseDelayMs ?? this.defaultBaseDelayMs;
      const retryMaxDelayMs = options.retryMaxDelayMs ?? this.defaultMaxDelayMs;
      const retryJitterMs = Math.max(0, options.retryJitterMs ?? this.defaultJitterMs);
      const jitterMs = retryJitterMs > 0 ? Math.floor(Math.random() * (retryJitterMs + 1)) : 0;
      const delayMs = Math.min(retryMaxDelayMs, retryBaseDelayMs * Math.pow(2, nextAttempts - 1));
      const availableAt = new Date(now.getTime() + delayMs + jitterMs);

      await tx.outboxEvent.update({
        where: { id },
        data: {
          status: "PENDING",
          attempts: nextAttempts,
          availableAt,
          lastError: options.error.slice(0, 2000),
          lockedBy: null,
          lockedUntil: null,
          updatedAt: now,
        },
      });
      return {
        outcome: "retried" as const,
        attempts: nextAttempts,
        nextAvailableAt: availableAt,
      };
    });
  }

  async getQueueStats(now: Date = new Date()): Promise<OutboxQueueStats> {
    const [duePendingCount, oldest] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: {
          status: "PENDING",
          availableAt: { lte: now },
        },
      }),
      this.prisma.outboxEvent.findFirst({
        where: {
          status: "PENDING",
          availableAt: { lte: now },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
    ]);

    return {
      duePendingCount,
      oldestDuePendingAgeMs: oldest
        ? Math.max(0, now.getTime() - oldest.createdAt.getTime())
        : null,
    };
  }
}
