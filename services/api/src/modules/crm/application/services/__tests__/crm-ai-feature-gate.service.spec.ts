import { describe, expect, it, vi } from "vitest";
import type { EnvService } from "@corely/config";
import { ForbiddenError } from "@corely/kernel";
import { CrmAiFeatureGateService } from "../crm-ai-feature-gate.service";
import type { CrmAiSettingsRepositoryPort } from "../../ports/crm-ai-settings-repository.port";

const createEnv = (
  overrides?: Partial<
    Pick<
      EnvService,
      "CRM_AI_ENABLED" | "CRM_AI_V2_ANALYTICS_ENABLED" | "CRM_AI_INTENT_SENTIMENT_ENABLED"
    >
  >
) =>
  ({
    CRM_AI_ENABLED: true,
    CRM_AI_V2_ANALYTICS_ENABLED: true,
    CRM_AI_INTENT_SENTIMENT_ENABLED: true,
    ...overrides,
  }) as EnvService;

const createRepo = (
  settings: Awaited<ReturnType<CrmAiSettingsRepositoryPort["getSettings"]>>
): CrmAiSettingsRepositoryPort => ({
  getSettings: vi.fn().mockResolvedValue(settings),
  saveSettings: vi.fn(),
});

describe("CrmAiFeatureGateService", () => {
  it("disables all AI capabilities when env gate is off", async () => {
    const service = new CrmAiFeatureGateService(
      createEnv({ CRM_AI_ENABLED: false }),
      createRepo({ aiEnabled: true, intentSentimentEnabled: true })
    );

    const state = await service.getState("tenant-1", "workspace-1");

    expect(state.aiEnabled).toBe(false);
    expect(state.v2AnalyticsEnabled).toBe(false);
    expect(state.intentSentimentEnabled).toBe(false);
  });

  it("combines workspace settings with env gates", async () => {
    const service = new CrmAiFeatureGateService(
      createEnv({
        CRM_AI_ENABLED: true,
        CRM_AI_V2_ANALYTICS_ENABLED: true,
        CRM_AI_INTENT_SENTIMENT_ENABLED: true,
      }),
      createRepo({ aiEnabled: true, intentSentimentEnabled: false })
    );

    const state = await service.getState("tenant-1", "workspace-1");

    expect(state.aiEnabled).toBe(true);
    expect(state.v2AnalyticsEnabled).toBe(true);
    expect(state.intentSentimentEnabled).toBe(false);
  });

  it("throws ForbiddenError when assertEnabled is called and AI is off", async () => {
    const service = new CrmAiFeatureGateService(
      createEnv({ CRM_AI_ENABLED: true }),
      createRepo({ aiEnabled: false, intentSentimentEnabled: false })
    );

    await expect(service.assertEnabled("tenant-1", "workspace-1")).rejects.toBeInstanceOf(
      ForbiddenError
    );
  });
});
