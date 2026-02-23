import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { AvailabilityRuleRepositoryPort } from "../../application/ports/booking-repo.ports";
import {
  AvailabilityRule,
  type WeeklyScheduleSlot,
  type BlackoutInterval,
} from "../../domain/booking.entities";
import { Prisma } from "@prisma/client";

@Injectable()
export class PrismaAvailabilityRuleRepoAdapter implements AvailabilityRuleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  private mapToDomain(row: any): AvailabilityRule {
    return new AvailabilityRule(
      row.id,
      row.tenantId,
      row.resourceId,
      row.timezone,
      row.weeklySlots as WeeklyScheduleSlot[],
      row.blackouts as BlackoutInterval[],
      row.effectiveFrom,
      row.effectiveTo,
      row.createdAt,
      row.updatedAt
    );
  }

  async upsert(rule: AvailabilityRule): Promise<AvailabilityRule> {
    const saved = await this.prisma.bookingAvailabilityRule.upsert({
      where: { tenantId_resourceId: { tenantId: rule.tenantId, resourceId: rule.resourceId } },
      create: {
        id: rule.id,
        tenantId: rule.tenantId,
        resourceId: rule.resourceId,
        timezone: rule.timezone,
        weeklySlots: rule.weeklySlots as any,
        blackouts: rule.blackouts as any,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      },
      update: {
        timezone: rule.timezone,
        weeklySlots: rule.weeklySlots as any,
        blackouts: rule.blackouts as any,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        updatedAt: rule.updatedAt,
      },
    });
    return this.mapToDomain(saved);
  }

  async findByResourceId(resourceId: string, tenantId: string): Promise<AvailabilityRule | null> {
    const row = await this.prisma.bookingAvailabilityRule.findUnique({
      where: { tenantId_resourceId: { tenantId, resourceId } },
    });
    return row ? this.mapToDomain(row) : null;
  }
}
