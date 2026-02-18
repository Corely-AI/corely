import { Inject, Injectable } from "@nestjs/common";
import { NotFoundError } from "@corely/kernel";
import type { DealAiHealth } from "@corely/contracts";
import { toDealDto } from "../mappers/deal-dto.mapper";
import { DEAL_REPO_PORT, type DealRepoPort } from "../ports/deal-repository.port";
import { ACTIVITY_REPO_PORT, type ActivityRepoPort } from "../ports/activity-repository.port";
import { computeDealAiAnalytics } from "../../domain/deal-ai-analytics";

type StageHistoryPoint = {
  toStageId: string;
  transitionedAt: Date;
};

type StageAnalytics = {
  stageMedianDays: number | null;
  stageRemainingP50Days: number | null;
  stageRemainingP80Days: number | null;
  stageSampleSize: number;
};

type HealthContext = {
  deal: ReturnType<typeof toDealDto>;
  health: DealAiHealth;
  timelineItems: Awaited<ReturnType<ActivityRepoPort["getTimeline"]>>["items"];
  activities: Awaited<ReturnType<ActivityRepoPort["list"]>>["items"];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const percentile = (values: number[], p: number): number | null => {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
};

const median = (values: number[]): number | null => percentile(values, 0.5);

const diffDays = (start: Date, end: Date): number =>
  Math.max(0, (end.getTime() - start.getTime()) / MS_PER_DAY);

@Injectable()
export class DealAiAnalyticsService {
  constructor(
    @Inject(DEAL_REPO_PORT) private readonly dealRepo: DealRepoPort,
    @Inject(ACTIVITY_REPO_PORT) private readonly activityRepo: ActivityRepoPort
  ) {}

  async buildHealthContext(tenantId: string, dealId: string, now: Date): Promise<HealthContext> {
    const deal = await this.dealRepo.findById(tenantId, dealId);
    if (!deal) {
      throw new NotFoundError(`Deal ${dealId} not found`);
    }

    const [timeline, activityList, stageTransitions, wonDeals, lostDeals] = await Promise.all([
      this.activityRepo.getTimeline(tenantId, "deal", deal.id, 80),
      this.activityRepo.list(tenantId, { dealId: deal.id }, 80),
      this.dealRepo.getStageTransitions(tenantId, deal.id, 120),
      this.listDealsByStatus(tenantId, "WON", 60),
      this.listDealsByStatus(tenantId, "LOST", 60),
    ]);

    const stageEnteredAt =
      stageTransitions.find((transition) => transition.toStageId === deal.stageId)
        ?.transitionedAt ?? deal.createdAt;

    const lastActivityAt =
      activityList.items
        .map((activity) => activity.activityDate ?? activity.createdAt)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    const stageClosedDeals = [...wonDeals, ...lostDeals].filter(
      (item) => item.stageId === deal.stageId
    );
    const wonInStage = wonDeals.filter((item) => item.stageId === deal.stageId);
    const stageAnalytics = await this.collectStageAnalytics(
      tenantId,
      deal.stageId,
      wonDeals.filter((item) => item.wonAt)
    );

    const analytics = computeDealAiAnalytics(
      {
        stageId: deal.stageId,
        stageConversion: {
          won: wonInStage.length,
          closed: stageClosedDeals.length,
        },
        stageMedianDays: stageAnalytics.stageMedianDays,
        stageRemainingP50Days: stageAnalytics.stageRemainingP50Days,
        stageRemainingP80Days: stageAnalytics.stageRemainingP80Days,
        stageSampleSize: stageAnalytics.stageSampleSize,
        wonSampleSize: wonDeals.length,
      },
      {
        stageId: deal.stageId,
        expectedCloseDate: deal.expectedCloseDate ? new Date(deal.expectedCloseDate) : null,
        amountCents: deal.amountCents,
        hasLinkedContact: Boolean(deal.partyId),
        stageEnteredAt,
        lastActivityAt,
        activityCount: activityList.items.length,
        now,
      }
    );

    const dealDto = toDealDto(deal);
    const health: DealAiHealth = {
      dealId: deal.id,
      status: analytics.status,
      explanation: analytics.explanation,
      winProbability: analytics.winProbability,
      confidence: analytics.confidence,
      lowConfidence: analytics.lowConfidence,
      forecastCloseDate: analytics.forecastCloseDate,
      forecastRange: analytics.forecastRange,
      topFactors: analytics.topFactors,
      computedAt: now.toISOString(),
    };

    return {
      deal: dealDto,
      health,
      timelineItems: timeline.items,
      activities: activityList.items,
    };
  }

  private async listDealsByStatus(
    tenantId: string,
    status: "WON" | "LOST",
    maxItems: number
  ): Promise<Array<{ id: string; stageId: string; wonAt: Date | null }>> {
    let cursor: string | undefined;
    const items: Array<{ id: string; stageId: string; wonAt: Date | null }> = [];

    while (items.length < maxItems) {
      const page = await this.dealRepo.list(tenantId, { status }, 30, cursor);
      items.push(
        ...page.items.map((deal) => ({
          id: deal.id,
          stageId: deal.stageId,
          wonAt: deal.wonAt,
        }))
      );
      if (!page.nextCursor) {
        break;
      }
      cursor = page.nextCursor;
    }

    return items.slice(0, maxItems);
  }

  private async collectStageAnalytics(
    tenantId: string,
    stageId: string,
    wonDeals: Array<{ id: string; wonAt: Date | null }>
  ): Promise<StageAnalytics> {
    const stageDurations: number[] = [];
    const remainingToWin: number[] = [];

    for (const wonDeal of wonDeals) {
      if (!wonDeal.wonAt) {
        continue;
      }
      const transitions = await this.dealRepo.getStageTransitions(tenantId, wonDeal.id, 120);
      const points = this.toAscendingPoints(transitions);
      if (!points.length) {
        continue;
      }

      for (let index = 0; index < points.length; index += 1) {
        const current = points[index];
        if (current.toStageId !== stageId) {
          continue;
        }
        const next = points[index + 1];
        if (next) {
          stageDurations.push(diffDays(current.transitionedAt, next.transitionedAt));
        }
        remainingToWin.push(diffDays(current.transitionedAt, wonDeal.wonAt));
      }
    }

    return {
      stageMedianDays: median(stageDurations),
      stageRemainingP50Days: percentile(remainingToWin, 0.5),
      stageRemainingP80Days: percentile(remainingToWin, 0.8),
      stageSampleSize: remainingToWin.length,
    };
  }

  private toAscendingPoints(
    transitions: Awaited<ReturnType<DealRepoPort["getStageTransitions"]>>
  ): StageHistoryPoint[] {
    return [...transitions]
      .sort((a, b) => a.transitionedAt.getTime() - b.transitionedAt.getTime())
      .map((transition) => ({
        toStageId: transition.toStageId,
        transitionedAt: transition.transitionedAt,
      }));
  }
}
