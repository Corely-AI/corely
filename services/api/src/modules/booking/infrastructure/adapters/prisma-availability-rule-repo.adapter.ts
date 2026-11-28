import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import type { TransactionContext } from "@corely/kernel";
import type { AvailabilityRuleRepositoryPort } from "../../application/ports/booking-repo.ports";
import {
  AvailabilityRule,
  type WeeklyScheduleSlot,
  type BlackoutInterval,
} from "../../domain/booking.entities";
import type { BookingAvailabilityRule } from "@prisma/client";

type StoredBlackoutInterval = Omit<BlackoutInterval, "startAt" | "endAt"> & {
  startAt: string;
  endAt: string;
};

@Injectable()
export class PrismaAvailabilityRuleRepoAdapter implements AvailabilityRuleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: BookingAvailabilityRule): AvailabilityRule {
    return new AvailabilityRule(
      row.id,
      row.tenantId,
      row.resourceId,
      row.timezone,
      row.weeklySlots as unknown as WeeklyScheduleSlot[],
      (row.blackouts as unknown as StoredBlackoutInterval[]).map((blackout) => ({
        ...blackout,
        startAt: new Date(blackout.startAt),
        endAt: new Date(blackout.endAt),
      })),
      row.effectiveFrom,
      row.effectiveTo,
      row.createdAt,
      row.updatedAt
    );
  }

  async lockResource(tenantId: string, resourceId: string, tx: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${resourceId}`}, 0))::text`;
  }

  async upsert(rule: AvailabilityRule, tx?: TransactionContext): Promise<AvailabilityRule> {
    const weeklySlots = rule.weeklySlots.map((slot) => ({ ...slot }));
    const blackouts = rule.blackouts.map((blackout) => ({
      ...blackout,
      startAt: blackout.startAt.toISOString(),
      endAt: blackout.endAt.toISOString(),
    }));
    const saved = await getPrismaClient(this.prisma, tx).bookingAvailabilityRule.upsert({
      where: { tenantId_resourceId: { tenantId: rule.tenantId, resourceId: rule.resourceId } },
      create: {
        id: rule.id,
        tenantId: rule.tenantId,
        resourceId: rule.resourceId,
        timezone: rule.timezone,
        weeklySlots,
        blackouts,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
      update: {
        timezone: rule.timezone,
        weeklySlots,
        blackouts,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        updatedAt: rule.updatedAt,
      },
    });
    return this.mapToDomain(saved);
  }

  async findByResourceId(
    resourceId: string,
    tenantId: string,
    tx?: TransactionContext
  ): Promise<AvailabilityRule | null> {
    const row = await getPrismaClient(this.prisma, tx).bookingAvailabilityRule.findUnique({
      where: { tenantId_resourceId: { tenantId, resourceId } },
    });
    return row ? this.mapToDomain(row) : null;
  }
}
