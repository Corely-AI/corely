import { describe, expect, it, vi } from "vitest";
import type { EnvService } from "@corely/config";
import type { DealAiHealth, DealDto } from "@corely/contracts";
import { NoopLogger, isOk } from "@corely/kernel";
import { PromptRegistry } from "@corely/prompts";
import { GetDealAiInsightsUseCase } from "../get-deal-ai-insights.usecase";
import type { CrmAiSnapshotRepositoryPort } from "../../../ports/crm-ai-snapshot-repository.port";
import { DealAiAnalyticsService } from "../../../services/deal-ai-analytics.service";
import { CrmAiFeatureGateService } from "../../../services/crm-ai-feature-gate.service";
import type { AiTextPort } from "../../../../../../shared/ai/ai-text.port";
import { PromptUsageLogger } from "../../../../../../shared/prompts/prompt-usage.logger";
import type { TimelineItem } from "../../../ports/activity-repository.port";
import type { ActivityEntity } from "../../../../domain/activity.entity";

type HealthContext = Awaited<ReturnType<DealAiAnalyticsService["buildHealthContext"]>>;

const nowIso = "2026-02-18T10:00:00.000Z";

const createDeal = (overrides?: Partial<DealDto>): DealDto => ({
  id: "deal-1",
  tenantId: "tenant-1",
  title: "Acme Renewal",
  partyId: "",
  stageId: "stage-1",
  amountCents: 250000,
  currency: "USD",
  expectedCloseDate: null,
  probability: null,
  status: "OPEN",
  ownerUserId: null,
  notes: "Pricing discussion in progress.",
  tags: [],
  wonAt: null,
  lostAt: null,
  lostReason: null,
  createdAt: nowIso,
  updatedAt: nowIso,
  ...overrides,
});

const createHealth = (overrides?: Partial<DealAiHealth>): DealAiHealth => ({
  dealId: "deal-1",
  status: "AT_RISK",
  explanation: "No next activity is scheduled.",
  winProbability: 0.41,
  confidence: 0.5,
  lowConfidence: false,
  forecastCloseDate: null,
  forecastRange: null,
  topFactors: [],
  computedAt: nowIso,
  ...overrides,
});

const createTimelineItem = (overrides?: Partial<TimelineItem>): TimelineItem => ({
  id: "tl-1",
  type: "NOTE",
  timestamp: new Date(nowIso),
  subject: "Quick note",
  body: "Customer requested pricing details.",
  actorUserId: "user-1",
  ...overrides,
});

const createActivity = (
  overrides?: Partial<Pick<ActivityEntity, "type" | "dueAt" | "status">>
): ActivityEntity =>
  ({
    type: "TASK",
    dueAt: null,
    status: "OPEN",
    ...overrides,
  }) as unknown as ActivityEntity;

const createHealthContext = (overrides?: Partial<HealthContext>): HealthContext => ({
  deal: createDeal(),
  health: createHealth(),
  timelineItems: [],
  activities: [],
  ...overrides,
});

const createUseCase = (params: { aiTextResponse: string; healthContext: HealthContext }) => {
  const aiText: AiTextPort = {
    generateText: vi.fn().mockResolvedValue(params.aiTextResponse),
  };
  const saveMock = vi.fn().mockResolvedValue(undefined);

  const snapshotRepo: CrmAiSnapshotRepositoryPort = {
    findLatestActive: vi.fn().mockResolvedValue(null),
    save: saveMock,
  };

  const analytics = {
    buildHealthContext: vi.fn().mockResolvedValue(params.healthContext),
  } as unknown as DealAiAnalyticsService;

  const featureGate = {
    getState: vi.fn().mockResolvedValue({
      aiEnabled: true,
      v2AnalyticsEnabled: true,
      intentSentimentEnabled: false,
      settings: { aiEnabled: true, intentSentimentEnabled: false },
    }),
  } as unknown as CrmAiFeatureGateService;

  const promptRegistry = {
    render: vi.fn().mockReturnValue({
      promptId: "crm.ai.deal_insights",
      promptVersion: "v1",
      promptHash: "hash",
      renderEngineVersion: "1",
      template: "template",
      content: "prompt",
      variables: {},
    }),
  } as unknown as PromptRegistry;

  const promptUsageLogger = {
    logUsage: vi.fn(),
  } as unknown as PromptUsageLogger;

  const env = {
    APP_ENV: "test",
    AI_MODEL_ID: "gpt-4o-mini",
    AI_MODEL_PROVIDER: "openai",
  } as EnvService;

  const useCase = new GetDealAiInsightsUseCase(
    aiText,
    snapshotRepo,
    analytics,
    featureGate,
    promptRegistry,
    promptUsageLogger,
    env,
    new NoopLogger()
  );

  return {
    useCase,
    aiText,
    snapshotRepo,
    saveMock,
  };
};

describe("GetDealAiInsightsUseCase", () => {
  it("returns fallback insights instead of error when AI output is malformed", async () => {
    const { useCase, saveMock } = createUseCase({
      aiTextResponse: "{ invalid json",
      healthContext: createHealthContext(),
    });

    const result = await useCase.execute(
      { dealId: "deal-1", forceRefresh: true },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) {
      return;
    }

    expect(result.value.insights.summary.situation).toBe("Pricing discussion in progress.");
    expect(result.value.insights.confidence).toBe(0.45);
    expect(result.value.insights.timelineEmpty).toBe(true);
    expect(result.value.insights.cached).toBe(false);
    expect(saveMock).toHaveBeenCalledOnce();
  });

  it("coerces numeric confidence fields returned as strings by AI", async () => {
    const aiPayload = JSON.stringify({
      summary: {
        situation: "Renewal is pending approval.",
        lastInteraction: "Sent proposal yesterday.",
        keyStakeholders: "John Doe",
        needs: "Pricing clarification",
        objections: "Budget constraints",
        nextStep: "Schedule follow-up call",
      },
      whatMissing: [{ code: "next-activity-missing", label: "No next activity is scheduled" }],
      keyEntities: [{ kind: "person", value: "John Doe", confidence: "0.82" }],
      confidence: "0.74",
    });
    const healthContext = createHealthContext({
      timelineItems: [createTimelineItem()],
      activities: [createActivity()],
    });
    const { useCase } = createUseCase({
      aiTextResponse: aiPayload,
      healthContext,
    });

    const result = await useCase.execute(
      { dealId: "deal-1", forceRefresh: true },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(isOk(result)).toBe(true);
    if (!isOk(result)) {
      return;
    }

    expect(result.value.insights.summary.situation).toBe("Renewal is pending approval.");
    expect(result.value.insights.confidence).toBe(0.74);
    expect(result.value.insights.keyEntities[0]?.confidence).toBe(0.82);
  });
});
