import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  ExternalServiceError,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
  err,
} from "@corely/kernel";
import {
  DealAiInsightsSchema,
  GetDealAiInsightsOutputSchema,
  type DealAiInsights,
  type GetDealAiInsightsOutput,
} from "@corely/contracts";
import { PromptRegistry } from "@corely/prompts";
import { EnvService } from "@corely/config";
import { PromptUsageLogger } from "../../../../../shared/prompts/prompt-usage.logger";
import { buildPromptContext } from "../../../../../shared/prompts/prompt-context";
import { AI_TEXT_PORT, type AiTextPort } from "../../../../../shared/ai/ai-text.port";
import {
  CRM_AI_SNAPSHOT_REPOSITORY_PORT,
  type CrmAiSnapshotRepositoryPort,
} from "../../ports/crm-ai-snapshot-repository.port";
import { DealAiAnalyticsService } from "../../services/deal-ai-analytics.service";
import { CrmAiFeatureGateService } from "../../services/crm-ai-feature-gate.service";
import {
  CRM_AI_INSIGHTS_TTL_MS,
  CRM_AI_SNAPSHOT_VERSION,
  buildTimelineContext,
  normalizeLanguage,
  parseAiJson,
  resolveWorkspaceId,
} from "./crm-ai.shared";

type GetDealAiInsightsInput = {
  dealId: string;
  forceRefresh?: boolean;
  workspaceLanguage?: string;
};

type DealInsightsPromptOutput = {
  summary: DealAiInsights["summary"];
  whatMissing: DealAiInsights["whatMissing"];
  keyEntities: DealAiInsights["keyEntities"];
  confidence: number;
};

@RequireTenant()
@Injectable()
export class GetDealAiInsightsUseCase extends BaseUseCase<
  GetDealAiInsightsInput,
  GetDealAiInsightsOutput
> {
  constructor(
    @Inject(AI_TEXT_PORT) private readonly aiText: AiTextPort,
    @Inject(CRM_AI_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepo: CrmAiSnapshotRepositoryPort,
    private readonly analytics: DealAiAnalyticsService,
    private readonly featureGate: CrmAiFeatureGateService,
    private readonly promptRegistry: PromptRegistry,
    private readonly promptUsageLogger: PromptUsageLogger,
    private readonly env: EnvService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: GetDealAiInsightsInput): GetDealAiInsightsInput {
    if (!input.dealId || !input.dealId.trim()) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: GetDealAiInsightsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetDealAiInsightsOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    const now = new Date();
    const language = normalizeLanguage(input.workspaceLanguage);

    if (!input.forceRefresh) {
      const cached = await this.snapshotRepo.findLatestActive(
        ctx.tenantId,
        workspaceId,
        input.dealId,
        "insights"
      );
      if (cached) {
        const parsed = GetDealAiInsightsOutputSchema.safeParse(cached.payloadJson);
        if (parsed.success) {
          return ok(parsed.data);
        }
      }
    }

    const featureState = await this.featureGate.getState(ctx.tenantId, workspaceId);
    const healthContext = await this.analytics.buildHealthContext(ctx.tenantId, input.dealId, now);
    const computedMissing = this.buildMissingItems({
      hasExpectedCloseDate: Boolean(healthContext.deal.expectedCloseDate),
      hasFutureNextActivity: healthContext.activities.some((activity) => {
        if (!activity.dueAt) {
          return false;
        }
        const isOpenType =
          activity.type === "TASK" || activity.type === "CALL" || activity.type === "MEETING";
        return (
          isOpenType && activity.dueAt.getTime() >= now.getTime() && activity.status === "OPEN"
        );
      }),
      hasLinkedContact: Boolean(healthContext.deal.partyId),
      hasAmount: healthContext.deal.amountCents !== null,
      timelineEmpty: healthContext.timelineItems.length === 0,
    });

    let insights = this.buildFallbackInsights({
      dealId: healthContext.deal.id,
      dealTitle: healthContext.deal.title,
      dealNotes: healthContext.deal.notes,
      timelineEmpty: healthContext.timelineItems.length === 0,
      timelineContext: healthContext.timelineItems,
      whatMissing: computedMissing,
      expectedCloseDate: healthContext.deal.expectedCloseDate,
      amountCents: healthContext.deal.amountCents,
      currency: healthContext.deal.currency,
      now,
    });

    if (featureState.aiEnabled) {
      try {
        const timelineContext = buildTimelineContext(healthContext.timelineItems, 24);
        const prompt = this.promptRegistry.render(
          "crm.ai.deal_insights",
          buildPromptContext({ env: this.env, tenantId: ctx.tenantId }),
          {
            LANGUAGE: language,
            DEAL_JSON: JSON.stringify(
              {
                id: healthContext.deal.id,
                title: healthContext.deal.title,
                stageId: healthContext.deal.stageId,
                amountCents: healthContext.deal.amountCents,
                currency: healthContext.deal.currency,
                expectedCloseDate: healthContext.deal.expectedCloseDate,
                notes: healthContext.deal.notes,
                status: healthContext.deal.status,
              },
              null,
              2
            ),
            TIMELINE_CONTEXT: timelineContext,
            MISSING_HINTS_JSON: JSON.stringify(computedMissing, null, 2),
          }
        );

        this.promptUsageLogger.logUsage({
          promptId: prompt.promptId,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          modelId: this.env.AI_MODEL_ID,
          provider: this.env.AI_MODEL_PROVIDER,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          purpose: "crm.ai.deal_insights",
        });

        const aiRaw = await this.aiText.generateText({
          systemPrompt:
            "You are a CRM assistant. Return strict JSON only. Never include markdown. Use null/unknown when uncertain.",
          userPrompt: prompt.content,
          temperature: 0.1,
          maxOutputTokens: 900,
        });

        const parsedPayload = this.parsePromptOutput(parseAiJson(aiRaw));
        insights = DealAiInsightsSchema.parse({
          dealId: healthContext.deal.id,
          summary: parsedPayload.summary,
          whatMissing: this.mergeMissing(computedMissing, parsedPayload.whatMissing),
          keyEntities: parsedPayload.keyEntities,
          confidence: parsedPayload.confidence,
          freshnessTimestamp: now.toISOString(),
          sourceActivityCount: healthContext.timelineItems.length,
          timelineEmpty: healthContext.timelineItems.length === 0,
          cached: false,
        });
      } catch (cause) {
        return err(
          new ExternalServiceError("Failed to generate deal AI insights", {
            reason: cause instanceof Error ? cause.message : String(cause),
          })
        );
      }
    }

    const output = GetDealAiInsightsOutputSchema.parse({
      insights,
      health: healthContext.health,
    });

    await this.snapshotRepo.save({
      tenantId: ctx.tenantId,
      workspaceId,
      dealId: input.dealId,
      kind: "insights",
      generatedAt: now,
      payloadJson: output as unknown as Record<string, unknown>,
      version: CRM_AI_SNAPSHOT_VERSION,
      ttlExpiresAt: new Date(now.getTime() + CRM_AI_INSIGHTS_TTL_MS),
    });

    return ok(output);
  }

  private parsePromptOutput(payload: Record<string, unknown>): DealInsightsPromptOutput {
    const parsed = DealAiInsightsSchema.pick({
      summary: true,
      whatMissing: true,
      keyEntities: true,
      confidence: true,
    }).parse(payload);
    return {
      summary: parsed.summary,
      whatMissing: parsed.whatMissing,
      keyEntities: parsed.keyEntities,
      confidence: parsed.confidence,
    };
  }

  private buildMissingItems(params: {
    hasExpectedCloseDate: boolean;
    hasFutureNextActivity: boolean;
    hasLinkedContact: boolean;
    hasAmount: boolean;
    timelineEmpty: boolean;
  }): DealAiInsights["whatMissing"] {
    const items: DealAiInsights["whatMissing"] = [];
    if (!params.hasExpectedCloseDate) {
      items.push({
        code: "expected-close-date-missing",
        label: "Expected close date is missing",
        severity: "high",
      });
    }
    if (!params.hasFutureNextActivity) {
      items.push({
        code: "next-activity-missing",
        label: "No next activity is scheduled",
        severity: "high",
      });
    }
    if (!params.hasLinkedContact) {
      items.push({
        code: "linked-contact-missing",
        label: "No linked contact",
        severity: "medium",
      });
    }
    if (!params.hasAmount) {
      items.push({
        code: "amount-missing",
        label: "Deal amount is missing",
        severity: "medium",
      });
    }
    if (params.timelineEmpty) {
      items.push({
        code: "timeline-empty",
        label: "No activity recorded yet",
        severity: "low",
      });
    }
    return items;
  }

  private mergeMissing(
    computed: DealAiInsights["whatMissing"],
    aiProvided: DealAiInsights["whatMissing"]
  ): DealAiInsights["whatMissing"] {
    const byCode = new Map<string, DealAiInsights["whatMissing"][number]>();
    for (const item of [...computed, ...aiProvided]) {
      byCode.set(item.code, item);
    }
    return [...byCode.values()];
  }

  private buildFallbackInsights(params: {
    dealId: string;
    dealTitle: string;
    dealNotes: string | null;
    timelineEmpty: boolean;
    timelineContext: Array<{ timestamp: Date; subject: string; body: string | null }>;
    whatMissing: DealAiInsights["whatMissing"];
    expectedCloseDate: string | null;
    amountCents: number | null;
    currency: string;
    now: Date;
  }): DealAiInsights {
    const latest = params.timelineContext[0];
    const keyEntities: DealAiInsights["keyEntities"] = [];
    if (params.amountCents !== null) {
      keyEntities.push({
        kind: "amount",
        value: `${(params.amountCents / 100).toFixed(2)} ${params.currency}`,
        confidence: 1,
      });
    }
    if (params.expectedCloseDate) {
      keyEntities.push({
        kind: "date",
        value: params.expectedCloseDate,
        confidence: 1,
      });
    }

    return DealAiInsightsSchema.parse({
      dealId: params.dealId,
      summary: {
        situation: params.dealNotes ?? `Opportunity: ${params.dealTitle}`,
        lastInteraction: latest
          ? `${latest.subject} (${latest.timestamp.toISOString().slice(0, 10)})`
          : "No activity recorded yet",
        keyStakeholders: "Unknown",
        needs: "Unknown",
        objections: "Unknown",
        nextStep: "Schedule the next customer-facing activity.",
      },
      whatMissing: params.whatMissing,
      keyEntities,
      confidence: 0.45,
      freshnessTimestamp: params.now.toISOString(),
      sourceActivityCount: params.timelineContext.length,
      timelineEmpty: params.timelineEmpty,
      cached: false,
    });
  }
}
