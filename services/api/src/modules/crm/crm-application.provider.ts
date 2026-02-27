import { type Provider } from "@nestjs/common";
import { CrmApplication } from "./application/crm.application";
import { CompleteActivityUseCase } from "./application/use-cases/complete-activity/complete-activity.usecase";
import { CreateActivityUseCase } from "./application/use-cases/create-activity/create-activity.usecase";
import { CreateCommunicationDraftUseCase } from "./application/use-cases/create-communication-draft/create-communication-draft.usecase";
import { CreateDealUseCase } from "./application/use-cases/create-deal/create-deal.usecase";
import { GetDealByIdUseCase } from "./application/use-cases/get-deal-by-id/get-deal-by-id.usecase";
import { GetTimelineUseCase } from "./application/use-cases/get-timeline/get-timeline.usecase";
import { ListActivitiesUseCase } from "./application/use-cases/list-activities/list-activities.usecase";
import { ListDealsUseCase } from "./application/use-cases/list-deals/list-deals.usecase";
import { LogCommunicationUseCase } from "./application/use-cases/log-communication/log-communication.usecase";
import { LogMessageUseCase } from "./application/use-cases/log-message/log-message.usecase";
import { MarkDealLostUseCase } from "./application/use-cases/mark-deal-lost/mark-deal-lost.usecase";
import { MarkDealWonUseCase } from "./application/use-cases/mark-deal-won/mark-deal-won.usecase";
import { MoveDealStageUseCase } from "./application/use-cases/move-deal-stage/move-deal-stage.usecase";
import { ProcessCommunicationWebhookUseCase } from "./application/use-cases/process-communication-webhook/process-communication-webhook.usecase";
import { SendCommunicationUseCase } from "./application/use-cases/send-communication/send-communication.usecase";
import { UpdateActivityUseCase } from "./application/use-cases/update-activity/update-activity.usecase";
import { UpdateDealUseCase } from "./application/use-cases/update-deal/update-deal.usecase";
import { DraftDealAiMessageUseCase } from "./application/use-cases/ai/draft-deal-ai-message.usecase";
import { ExtractActivityAiUseCase } from "./application/use-cases/ai/extract-activity-ai.usecase";
import { GetCrmAiSettingsUseCase } from "./application/use-cases/ai/get-crm-ai-settings.usecase";
import { GetDealAiInsightsUseCase } from "./application/use-cases/ai/get-deal-ai-insights.usecase";
import { GetDealAiRecommendationsUseCase } from "./application/use-cases/ai/get-deal-ai-recommendations.usecase";
import { ParseActivityAiUseCase } from "./application/use-cases/ai/parse-activity-ai.usecase";
import { SummarizeCommunicationAiUseCase } from "./application/use-cases/ai/summarize-communication-ai.usecase";
import { UpdateCrmAiSettingsUseCase } from "./application/use-cases/ai/update-crm-ai-settings.usecase";

export const CRM_APPLICATION_PROVIDER: Provider = {
  provide: CrmApplication,
  useFactory: (
    createDeal: CreateDealUseCase,
    updateDeal: UpdateDealUseCase,
    moveDealStage: MoveDealStageUseCase,
    markDealWon: MarkDealWonUseCase,
    markDealLost: MarkDealLostUseCase,
    listDeals: ListDealsUseCase,
    getDealById: GetDealByIdUseCase,
    createActivity: CreateActivityUseCase,
    updateActivity: UpdateActivityUseCase,
    completeActivity: CompleteActivityUseCase,
    listActivities: ListActivitiesUseCase,
    getTimeline: GetTimelineUseCase,
    logMessage: LogMessageUseCase,
    createCommunicationDraft: CreateCommunicationDraftUseCase,
    sendCommunication: SendCommunicationUseCase,
    logCommunication: LogCommunicationUseCase,
    processCommunicationWebhook: ProcessCommunicationWebhookUseCase,
    getDealAiInsights: GetDealAiInsightsUseCase,
    getDealAiRecommendations: GetDealAiRecommendationsUseCase,
    draftDealAiMessage: DraftDealAiMessageUseCase,
    parseActivityAi: ParseActivityAiUseCase,
    extractActivityAi: ExtractActivityAiUseCase,
    summarizeCommunicationAi: SummarizeCommunicationAiUseCase,
    getCrmAiSettings: GetCrmAiSettingsUseCase,
    updateCrmAiSettings: UpdateCrmAiSettingsUseCase
  ) =>
    new CrmApplication(
      createDeal,
      updateDeal,
      moveDealStage,
      markDealWon,
      markDealLost,
      listDeals,
      getDealById,
      createActivity,
      updateActivity,
      completeActivity,
      listActivities,
      getTimeline,
      logMessage,
      createCommunicationDraft,
      sendCommunication,
      logCommunication,
      processCommunicationWebhook,
      getDealAiInsights,
      getDealAiRecommendations,
      draftDealAiMessage,
      parseActivityAi,
      extractActivityAi,
      summarizeCommunicationAi,
      getCrmAiSettings,
      updateCrmAiSettings
    ),
  inject: [
    CreateDealUseCase,
    UpdateDealUseCase,
    MoveDealStageUseCase,
    MarkDealWonUseCase,
    MarkDealLostUseCase,
    ListDealsUseCase,
    GetDealByIdUseCase,
    CreateActivityUseCase,
    UpdateActivityUseCase,
    CompleteActivityUseCase,
    ListActivitiesUseCase,
    GetTimelineUseCase,
    LogMessageUseCase,
    CreateCommunicationDraftUseCase,
    SendCommunicationUseCase,
    LogCommunicationUseCase,
    ProcessCommunicationWebhookUseCase,
    GetDealAiInsightsUseCase,
    GetDealAiRecommendationsUseCase,
    DraftDealAiMessageUseCase,
    ParseActivityAiUseCase,
    ExtractActivityAiUseCase,
    SummarizeCommunicationAiUseCase,
    GetCrmAiSettingsUseCase,
    UpdateCrmAiSettingsUseCase,
  ],
};
