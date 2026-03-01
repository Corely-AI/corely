import { type Provider } from "@nestjs/common";
import { EnvService } from "@corely/config";
import { PromptRegistry } from "@corely/prompts";
import type { AiTextPort } from "../../shared/ai/ai-text.port";
import { AI_TEXT_PORT } from "../../shared/ai/ai-text.port";
import { AiSdkTextAdapter } from "../../shared/ai/ai-sdk-text.adapter";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { PromptUsageLogger } from "../../shared/prompts/prompt-usage.logger";
import { PartyApplication } from "../party/application/party.application";
import { ACTIVITY_REPO_PORT } from "./application/ports/activity-repository.port";
import {
  CRM_AI_SETTINGS_REPOSITORY_PORT,
  type CrmAiSettingsRepositoryPort,
} from "./application/ports/crm-ai-settings-repository.port";
import {
  CRM_AI_SNAPSHOT_REPOSITORY_PORT,
  type CrmAiSnapshotRepositoryPort,
} from "./application/ports/crm-ai-snapshot-repository.port";
import { DEAL_REPO_PORT } from "./application/ports/deal-repository.port";
import { CrmAiFeatureGateService } from "./application/services/crm-ai-feature-gate.service";
import { DealAiAnalyticsService } from "./application/services/deal-ai-analytics.service";
import { DraftDealAiMessageUseCase } from "./application/use-cases/ai/draft-deal-ai-message.usecase";
import { ExtractActivityAiUseCase } from "./application/use-cases/ai/extract-activity-ai.usecase";
import { GenerateChannelTemplateAiUseCase } from "./application/use-cases/ai/generate-channel-template-ai.usecase";
import { GetCrmAiSettingsUseCase } from "./application/use-cases/ai/get-crm-ai-settings.usecase";
import { GetDealAiInsightsUseCase } from "./application/use-cases/ai/get-deal-ai-insights.usecase";
import { GetDealAiRecommendationsUseCase } from "./application/use-cases/ai/get-deal-ai-recommendations.usecase";
import { ParseActivityAiUseCase } from "./application/use-cases/ai/parse-activity-ai.usecase";
import { SummarizeCommunicationAiUseCase } from "./application/use-cases/ai/summarize-communication-ai.usecase";
import { UpdateCrmAiSettingsUseCase } from "./application/use-cases/ai/update-crm-ai-settings.usecase";
import { type PrismaActivityRepoAdapter } from "./infrastructure/prisma/prisma-activity-repo.adapter";
import { PrismaCrmAiSettingsRepoAdapter } from "./infrastructure/prisma/prisma-crm-ai-settings-repo.adapter";
import { PrismaCrmAiSnapshotRepoAdapter } from "./infrastructure/prisma/prisma-crm-ai-snapshot-repo.adapter";
import { type PrismaDealRepoAdapter } from "./infrastructure/prisma/prisma-deal-repo.adapter";

export const CRM_AI_PROVIDERS: Provider[] = [
  AiSdkTextAdapter,
  { provide: AI_TEXT_PORT, useExisting: AiSdkTextAdapter },
  PrismaCrmAiSnapshotRepoAdapter,
  PrismaCrmAiSettingsRepoAdapter,
  { provide: CRM_AI_SNAPSHOT_REPOSITORY_PORT, useExisting: PrismaCrmAiSnapshotRepoAdapter },
  { provide: CRM_AI_SETTINGS_REPOSITORY_PORT, useExisting: PrismaCrmAiSettingsRepoAdapter },
  {
    provide: CrmAiFeatureGateService,
    useFactory: (env: EnvService, settingsRepo: CrmAiSettingsRepositoryPort) =>
      new CrmAiFeatureGateService(env, settingsRepo),
    inject: [EnvService, CRM_AI_SETTINGS_REPOSITORY_PORT],
  },
  {
    provide: DealAiAnalyticsService,
    useFactory: (dealRepo: PrismaDealRepoAdapter, activityRepo: PrismaActivityRepoAdapter) =>
      new DealAiAnalyticsService(dealRepo, activityRepo),
    inject: [DEAL_REPO_PORT, ACTIVITY_REPO_PORT],
  },
  {
    provide: GetCrmAiSettingsUseCase,
    useFactory: (settingsRepo: CrmAiSettingsRepositoryPort, env: EnvService) =>
      new GetCrmAiSettingsUseCase(settingsRepo, env, new NestLoggerAdapter()),
    inject: [CRM_AI_SETTINGS_REPOSITORY_PORT, EnvService],
  },
  {
    provide: UpdateCrmAiSettingsUseCase,
    useFactory: (settingsRepo: CrmAiSettingsRepositoryPort) =>
      new UpdateCrmAiSettingsUseCase(settingsRepo, new NestLoggerAdapter()),
    inject: [CRM_AI_SETTINGS_REPOSITORY_PORT],
  },
  {
    provide: GetDealAiInsightsUseCase,
    useFactory: (
      aiText: AiTextPort,
      snapshotRepo: CrmAiSnapshotRepositoryPort,
      analytics: DealAiAnalyticsService,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new GetDealAiInsightsUseCase(
        aiText,
        snapshotRepo,
        analytics,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [
      AI_TEXT_PORT,
      CRM_AI_SNAPSHOT_REPOSITORY_PORT,
      DealAiAnalyticsService,
      CrmAiFeatureGateService,
      PromptRegistry,
      PromptUsageLogger,
      EnvService,
    ],
  },
  {
    provide: GetDealAiRecommendationsUseCase,
    useFactory: (snapshotRepo: CrmAiSnapshotRepositoryPort, analytics: DealAiAnalyticsService) =>
      new GetDealAiRecommendationsUseCase(snapshotRepo, analytics, new NestLoggerAdapter()),
    inject: [CRM_AI_SNAPSHOT_REPOSITORY_PORT, DealAiAnalyticsService],
  },
  {
    provide: DraftDealAiMessageUseCase,
    useFactory: (
      aiText: AiTextPort,
      analytics: DealAiAnalyticsService,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new DraftDealAiMessageUseCase(
        aiText,
        analytics,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [
      AI_TEXT_PORT,
      DealAiAnalyticsService,
      CrmAiFeatureGateService,
      PromptRegistry,
      PromptUsageLogger,
      EnvService,
    ],
  },
  {
    provide: GenerateChannelTemplateAiUseCase,
    useFactory: (
      aiText: AiTextPort,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new GenerateChannelTemplateAiUseCase(
        aiText,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [AI_TEXT_PORT, CrmAiFeatureGateService, PromptRegistry, PromptUsageLogger, EnvService],
  },
  {
    provide: ParseActivityAiUseCase,
    useFactory: (
      aiText: AiTextPort,
      dealRepo: PrismaDealRepoAdapter,
      partyApp: PartyApplication,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new ParseActivityAiUseCase(
        aiText,
        dealRepo,
        partyApp,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [
      AI_TEXT_PORT,
      DEAL_REPO_PORT,
      PartyApplication,
      CrmAiFeatureGateService,
      PromptRegistry,
      PromptUsageLogger,
      EnvService,
    ],
  },
  {
    provide: ExtractActivityAiUseCase,
    useFactory: (
      aiText: AiTextPort,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new ExtractActivityAiUseCase(
        aiText,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [AI_TEXT_PORT, CrmAiFeatureGateService, PromptRegistry, PromptUsageLogger, EnvService],
  },
  {
    provide: SummarizeCommunicationAiUseCase,
    useFactory: (
      aiText: AiTextPort,
      featureGate: CrmAiFeatureGateService,
      promptRegistry: PromptRegistry,
      promptUsageLogger: PromptUsageLogger,
      env: EnvService
    ) =>
      new SummarizeCommunicationAiUseCase(
        aiText,
        featureGate,
        promptRegistry,
        promptUsageLogger,
        env,
        new NestLoggerAdapter()
      ),
    inject: [AI_TEXT_PORT, CrmAiFeatureGateService, PromptRegistry, PromptUsageLogger, EnvService],
  },
];
