import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import {
  DEFAULT_PIPELINE_STAGES,
  GetDealAiRecommendationsOutputSchema,
  type DealAiRecommendation,
  type GetDealAiRecommendationsOutput,
  type CrmMessageDraft,
} from "@corely/contracts";
import {
  CRM_AI_SNAPSHOT_REPOSITORY_PORT,
  type CrmAiSnapshotRepositoryPort,
} from "../../ports/crm-ai-snapshot-repository.port";
import { DealAiAnalyticsService } from "../../services/deal-ai-analytics.service";
import {
  CRM_AI_INSIGHTS_TTL_MS,
  CRM_AI_SNAPSHOT_VERSION,
  normalizeLanguage,
  resolveWorkspaceId,
} from "./crm-ai.shared";

type GetDealAiRecommendationsInput = {
  dealId: string;
  workspaceLanguage?: string;
  forceRefresh?: boolean;
};

@RequireTenant()
@Injectable()
export class GetDealAiRecommendationsUseCase extends BaseUseCase<
  GetDealAiRecommendationsInput,
  GetDealAiRecommendationsOutput
> {
  constructor(
    @Inject(CRM_AI_SNAPSHOT_REPOSITORY_PORT)
    private readonly snapshotRepo: CrmAiSnapshotRepositoryPort,
    private readonly analytics: DealAiAnalyticsService,
    logger: LoggerPort
  ) {
    super({ logger });
  }

  protected validate(input: GetDealAiRecommendationsInput): GetDealAiRecommendationsInput {
    if (!input.dealId || !input.dealId.trim()) {
      throw new ValidationError("dealId is required");
    }
    return input;
  }

  protected async handle(
    input: GetDealAiRecommendationsInput,
    ctx: UseCaseContext
  ): Promise<Result<GetDealAiRecommendationsOutput, UseCaseError>> {
    const workspaceId = resolveWorkspaceId(ctx.tenantId, ctx.workspaceId);
    const now = new Date();
    const language = normalizeLanguage(input.workspaceLanguage);

    if (!input.forceRefresh) {
      const cached = await this.snapshotRepo.findLatestActive(
        ctx.tenantId,
        workspaceId,
        input.dealId,
        "recommendations"
      );
      if (cached) {
        const parsed = GetDealAiRecommendationsOutputSchema.safeParse(cached.payloadJson);
        if (parsed.success) {
          return ok(parsed.data);
        }
      }
    }

    const healthContext = await this.analytics.buildHealthContext(ctx.tenantId, input.dealId, now);
    const recommendations = this.buildRecommendations({
      dealId: healthContext.deal.id,
      dealTitle: healthContext.deal.title,
      stageId: healthContext.deal.stageId,
      expectedCloseDate: healthContext.deal.expectedCloseDate,
      partyId: healthContext.deal.partyId,
      health: healthContext.health,
      hasUpcomingTask: healthContext.activities.some((activity) => {
        if (!activity.dueAt) {
          return false;
        }
        const actionable =
          activity.type === "TASK" || activity.type === "CALL" || activity.type === "MEETING";
        return actionable && activity.status === "OPEN" && activity.dueAt.getTime() > now.getTime();
      }),
      hasRecentCommunication: healthContext.activities.some(
        (activity) => activity.type === "COMMUNICATION"
      ),
      language,
      now,
    });

    const output = GetDealAiRecommendationsOutputSchema.parse({
      recommendations,
      generatedAt: now.toISOString(),
    });

    await this.snapshotRepo.save({
      tenantId: ctx.tenantId,
      workspaceId,
      dealId: input.dealId,
      kind: "recommendations",
      generatedAt: now,
      payloadJson: output as unknown as Record<string, unknown>,
      version: CRM_AI_SNAPSHOT_VERSION,
      ttlExpiresAt: new Date(now.getTime() + CRM_AI_INSIGHTS_TTL_MS),
    });

    return ok(output);
  }

  private buildRecommendations(params: {
    dealId: string;
    dealTitle: string;
    stageId: string;
    expectedCloseDate: string | null;
    partyId: string;
    health: { winProbability?: number; forecastCloseDate?: string | null };
    hasUpcomingTask: boolean;
    hasRecentCommunication: boolean;
    language: string;
    now: Date;
  }): DealAiRecommendation[] {
    const recommendations: DealAiRecommendation[] = [];

    if (!params.hasUpcomingTask) {
      const suggestedDueAt = new Date(params.now.getTime() + 24 * 60 * 60 * 1000);
      suggestionsPush(
        recommendations,
        {
          type: "scheduleTask",
          id: randomUUID(),
          title: "Schedule next task",
          reason: "No follow-up task is currently scheduled.",
          confidence: 0.84,
          subject: `Follow up on ${params.dealTitle}`,
          suggestedDueAt: suggestedDueAt.toISOString(),
          toolCard: {
            toolCardType: "createActivity",
            title: "Create follow-up task",
            confirmationLabel: "Create task",
            payload: {
              type: "TASK",
              subject: `Follow up on ${params.dealTitle}`,
              dealId: params.dealId,
              partyId: params.partyId,
              dueAt: suggestedDueAt.toISOString(),
            },
            idempotencyKey: randomUUID(),
          },
        },
        5
      );
    }

    const draft = this.buildDraft(params);
    suggestionsPush(
      recommendations,
      {
        type: "draftMessage",
        id: randomUUID(),
        title: "Draft follow-up message",
        reason: params.hasRecentCommunication
          ? "Build on the latest communication while context is fresh."
          : "Establish the next touchpoint with the customer.",
        confidence: 0.79,
        channel: "email",
        toolCard: {
          toolCardType: "draftMessage",
          title: "Draft follow-up message",
          confirmationLabel: "Use draft",
          payload: draft,
          idempotencyKey: randomUUID(),
        },
      },
      5
    );

    suggestionsPush(
      recommendations,
      {
        type: "meetingAgenda",
        id: randomUUID(),
        title: "Prepare meeting agenda",
        reason: "Use a structured agenda to improve conversion quality.",
        confidence: 0.72,
        agendaPoints: [
          "Recap current goals and open questions",
          "Review pricing and timeline expectations",
          "Confirm decision process and next milestone",
        ],
        toolCard: {
          toolCardType: "draftMessage",
          title: "Meeting agenda draft",
          confirmationLabel: "Use agenda draft",
          payload: {
            ...draft,
            variants: [
              {
                style: "normal",
                subject: `Agenda for ${params.dealTitle}`,
                body: [
                  "1) Recap objectives and current blockers",
                  "2) Review pricing/options",
                  "3) Align expected close timeline",
                  "4) Confirm next actions and owners",
                ].join("\n"),
              },
            ],
          },
          idempotencyKey: randomUUID(),
        },
      },
      5
    );

    const nextStage = this.getNextPipelineStage(params.stageId);
    const winProbability = params.health.winProbability ?? 0.5;

    if (nextStage && winProbability >= 0.7) {
      suggestionsPush(
        recommendations,
        {
          type: "stageMove",
          id: randomUUID(),
          title: "Suggest stage move",
          reason: "Deal health is strong and progression criteria are likely met.",
          confidence: 0.68,
          suggestedStageId: nextStage.id,
          toolCard: {
            toolCardType: "updateDealFields",
            title: "Move deal stage",
            confirmationLabel: "Move stage",
            payload: {
              dealId: params.dealId,
              stageId: nextStage.id,
            },
            idempotencyKey: randomUUID(),
          },
        },
        5
      );
    }

    if (!params.expectedCloseDate || params.health.forecastCloseDate) {
      suggestionsPush(
        recommendations,
        {
          type: "closeDateUpdate",
          id: randomUUID(),
          title: "Suggest close date update",
          reason: params.expectedCloseDate
            ? "Forecast indicates a revised close date."
            : "Set an expected close date for better forecasting.",
          confidence: 0.66,
          suggestedExpectedCloseDate: params.health.forecastCloseDate,
          toolCard: {
            toolCardType: "updateDealFields",
            title: "Update expected close date",
            confirmationLabel: "Update close date",
            payload: {
              dealId: params.dealId,
              expectedCloseDate: params.health.forecastCloseDate ?? null,
            },
            idempotencyKey: randomUUID(),
          },
        },
        5
      );
    }

    return recommendations.slice(0, 5);
  }

  private getNextPipelineStage(stageId: string) {
    const sorted = [...DEFAULT_PIPELINE_STAGES].sort((a, b) => a.orderIndex - b.orderIndex);
    const index = sorted.findIndex((stage) => stage.id === stageId);
    if (index === -1 || index >= sorted.length - 1) {
      return null;
    }
    const next = sorted[index + 1];
    return next.isClosedStage ? null : next;
  }

  private buildDraft(params: {
    dealTitle: string;
    expectedCloseDate: string | null;
    language: string;
  }): CrmMessageDraft {
    const closeDate = params.expectedCloseDate ?? "a target date";
    return {
      channel: "email",
      language: params.language,
      variants: [
        {
          style: "short",
          subject: `Quick follow-up: ${params.dealTitle}`,
          body: `Hi {{contact_first_name}}, quick follow-up on ${params.dealTitle}. Are we still aligned for ${closeDate}?`,
        },
        {
          style: "normal",
          subject: `Next steps for ${params.dealTitle}`,
          body: [
            "Hi {{contact_first_name}},",
            "",
            `I wanted to follow up on ${params.dealTitle} and confirm next steps.`,
            "Could we align on open questions and timeline this week?",
            "",
            "Best regards,",
            "{{sender_name}}",
          ].join("\n"),
        },
        {
          style: "assertive",
          subject: `Decision checkpoint for ${params.dealTitle}`,
          body: [
            "Hi {{contact_first_name}},",
            "",
            "To keep momentum, let’s lock the remaining decisions and timeline.",
            "Please share confirmation today or suggest a specific time to close open points.",
            "",
            "Regards,",
            "{{sender_name}}",
          ].join("\n"),
        },
      ],
      personalizeWithTimeline: true,
      translateToWorkspaceLanguage: params.language !== "en",
      placeholdersUsed: [
        { key: "contact_first_name", value: null, fallback: "there" },
        { key: "sender_name", value: null, fallback: "the team" },
      ],
    };
  }
}

const suggestionsPush = (
  target: DealAiRecommendation[],
  recommendation: DealAiRecommendation,
  max: number
) => {
  if (target.length < max) {
    target.push(recommendation);
  }
};
