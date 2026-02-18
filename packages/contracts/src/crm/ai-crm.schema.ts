import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { ActivityTypeSchema } from "./activity.types";
import { CreateActivityInputSchema } from "./create-activity.schema";
import { LogCommunicationInputSchema } from "./communications.schema";

export const DealAiHealthStatusSchema = z.enum(["GOOD", "AT_RISK", "STALLED"]);
export type DealAiHealthStatus = z.infer<typeof DealAiHealthStatusSchema>;

export const DealAiSummaryBulletsSchema = z.object({
  situation: z.string(),
  lastInteraction: z.string(),
  keyStakeholders: z.string(),
  needs: z.string(),
  objections: z.string(),
  nextStep: z.string(),
});
export type DealAiSummaryBullets = z.infer<typeof DealAiSummaryBulletsSchema>;

export const DealAiMissingItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  reason: z.string().optional(),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});
export type DealAiMissingItem = z.infer<typeof DealAiMissingItemSchema>;

export const DealAiEntitySchema = z.object({
  kind: z.enum(["person", "company", "product", "amount", "date", "other"]),
  value: z.string(),
  confidence: z.number().min(0).max(1).optional(),
});
export type DealAiEntity = z.infer<typeof DealAiEntitySchema>;

export const DealAiInsightsSchema = z.object({
  dealId: z.string(),
  summary: DealAiSummaryBulletsSchema,
  whatMissing: z.array(DealAiMissingItemSchema),
  keyEntities: z.array(DealAiEntitySchema),
  confidence: z.number().min(0).max(1),
  freshnessTimestamp: utcInstantSchema,
  sourceActivityCount: z.number().int().nonnegative(),
  timelineEmpty: z.boolean(),
  cached: z.boolean().default(false),
});
export type DealAiInsights = z.infer<typeof DealAiInsightsSchema>;

export const DealAiContributingFactorSchema = z.object({
  label: z.string(),
  reason: z.string(),
  weight: z.number(),
  impact: z.enum(["positive", "negative", "neutral"]),
});
export type DealAiContributingFactor = z.infer<typeof DealAiContributingFactorSchema>;

export const DealAiForecastRangeSchema = z.object({
  p50CloseDate: z.string().nullable(),
  p80CloseDate: z.string().nullable(),
});
export type DealAiForecastRange = z.infer<typeof DealAiForecastRangeSchema>;

export const DealAiHealthSchema = z.object({
  dealId: z.string(),
  status: DealAiHealthStatusSchema,
  explanation: z.string(),
  winProbability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  lowConfidence: z.boolean(),
  forecastCloseDate: z.string().nullable(),
  forecastRange: DealAiForecastRangeSchema.nullable(),
  topFactors: z.array(DealAiContributingFactorSchema).max(3),
  computedAt: utcInstantSchema,
});
export type DealAiHealth = z.infer<typeof DealAiHealthSchema>;

export const CrmMessageDraftVariantSchema = z.object({
  style: z.enum(["short", "normal", "assertive", "friendly", "neutral", "direct"]),
  subject: z.string().optional(),
  body: z.string(),
});
export type CrmMessageDraftVariant = z.infer<typeof CrmMessageDraftVariantSchema>;

export const CrmMessagePlaceholderSchema = z.object({
  key: z.string(),
  value: z.string().nullable(),
  fallback: z.string(),
});
export type CrmMessagePlaceholder = z.infer<typeof CrmMessagePlaceholderSchema>;

export const CrmMessageDraftSchema = z.object({
  channel: z.string(),
  language: z.string(),
  variants: z.array(CrmMessageDraftVariantSchema).min(1),
  personalizeWithTimeline: z.boolean().default(true),
  translateToWorkspaceLanguage: z.boolean().default(false),
  placeholdersUsed: z.array(CrmMessagePlaceholderSchema),
});
export type CrmMessageDraft = z.infer<typeof CrmMessageDraftSchema>;

export const DraftMessageToolCardSchema = z.object({
  toolCardType: z.literal("draftMessage"),
  title: z.string(),
  description: z.string().optional(),
  confirmationLabel: z.string().default("Use draft"),
  payload: CrmMessageDraftSchema,
  idempotencyKey: z.string().optional(),
});
export type DraftMessageToolCard = z.infer<typeof DraftMessageToolCardSchema>;

export const CreateActivityToolCardSchema = z.object({
  toolCardType: z.literal("createActivity"),
  title: z.string(),
  description: z.string().optional(),
  confirmationLabel: z.string().default("Create activity"),
  payload: CreateActivityInputSchema,
  idempotencyKey: z.string().optional(),
});
export type CreateActivityToolCard = z.infer<typeof CreateActivityToolCardSchema>;

export const LogCommunicationToolCardSchema = z.object({
  toolCardType: z.literal("logCommunication"),
  title: z.string(),
  description: z.string().optional(),
  confirmationLabel: z.string().default("Log communication"),
  payload: LogCommunicationInputSchema,
  idempotencyKey: z.string().optional(),
});
export type LogCommunicationToolCard = z.infer<typeof LogCommunicationToolCardSchema>;

export const UpdateDealFieldsInputSchema = z.object({
  dealId: z.string(),
  stageId: z.string().optional(),
  expectedCloseDate: z.string().nullable().optional(),
  probability: z.number().int().min(0).max(100).nullable().optional(),
});
export type UpdateDealFieldsInput = z.infer<typeof UpdateDealFieldsInputSchema>;

export const UpdateDealFieldsToolCardSchema = z.object({
  toolCardType: z.literal("updateDealFields"),
  title: z.string(),
  description: z.string().optional(),
  confirmationLabel: z.string().default("Update deal"),
  payload: UpdateDealFieldsInputSchema,
  idempotencyKey: z.string().optional(),
});
export type UpdateDealFieldsToolCard = z.infer<typeof UpdateDealFieldsToolCardSchema>;

export const DealAiRecommendationBaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

export const DealAiScheduleTaskRecommendationSchema = DealAiRecommendationBaseSchema.extend({
  type: z.literal("scheduleTask"),
  subject: z.string(),
  suggestedDueAt: utcInstantSchema.nullable(),
  toolCard: CreateActivityToolCardSchema,
});
export type DealAiScheduleTaskRecommendation = z.infer<
  typeof DealAiScheduleTaskRecommendationSchema
>;

export const DealAiDraftMessageRecommendationSchema = DealAiRecommendationBaseSchema.extend({
  type: z.literal("draftMessage"),
  channel: z.string(),
  toolCard: DraftMessageToolCardSchema,
});
export type DealAiDraftMessageRecommendation = z.infer<
  typeof DealAiDraftMessageRecommendationSchema
>;

export const DealAiMeetingAgendaRecommendationSchema = DealAiRecommendationBaseSchema.extend({
  type: z.literal("meetingAgenda"),
  agendaPoints: z.array(z.string()),
  toolCard: DraftMessageToolCardSchema,
});
export type DealAiMeetingAgendaRecommendation = z.infer<
  typeof DealAiMeetingAgendaRecommendationSchema
>;

export const DealAiStageMoveRecommendationSchema = DealAiRecommendationBaseSchema.extend({
  type: z.literal("stageMove"),
  suggestedStageId: z.string(),
  toolCard: UpdateDealFieldsToolCardSchema,
});
export type DealAiStageMoveRecommendation = z.infer<typeof DealAiStageMoveRecommendationSchema>;

export const DealAiCloseDateUpdateRecommendationSchema = DealAiRecommendationBaseSchema.extend({
  type: z.literal("closeDateUpdate"),
  suggestedExpectedCloseDate: z.string().nullable(),
  toolCard: UpdateDealFieldsToolCardSchema,
});
export type DealAiCloseDateUpdateRecommendation = z.infer<
  typeof DealAiCloseDateUpdateRecommendationSchema
>;

export const DealAiRecommendationSchema = z.discriminatedUnion("type", [
  DealAiScheduleTaskRecommendationSchema,
  DealAiDraftMessageRecommendationSchema,
  DealAiMeetingAgendaRecommendationSchema,
  DealAiStageMoveRecommendationSchema,
  DealAiCloseDateUpdateRecommendationSchema,
]);
export type DealAiRecommendation = z.infer<typeof DealAiRecommendationSchema>;

export const ActivityAiLinkSuggestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number().min(0).max(1),
  reason: z.string().optional(),
});
export type ActivityAiLinkSuggestion = z.infer<typeof ActivityAiLinkSuggestionSchema>;

export const ActivityAiParseResultSchema = z.object({
  activityType: ActivityTypeSchema.optional(),
  subject: z.string().optional(),
  dueAt: utcInstantSchema.nullable().optional(),
  notesTemplate: z.string().optional(),
  suggestedDeals: z.array(ActivityAiLinkSuggestionSchema),
  suggestedContacts: z.array(ActivityAiLinkSuggestionSchema),
  confidence: z.number().min(0).max(1),
});
export type ActivityAiParseResult = z.infer<typeof ActivityAiParseResultSchema>;

export const ActivityAiActionItemSchema = z.object({
  subject: z.string(),
  details: z.string().optional(),
  suggestedType: ActivityTypeSchema.default("TASK"),
  dueAt: utcInstantSchema.nullable().optional(),
  confidence: z.number().min(0).max(1).default(0.6),
});
export type ActivityAiActionItem = z.infer<typeof ActivityAiActionItemSchema>;

export const ActivityAiExtractResultSchema = z.object({
  summary: z.string(),
  actionItems: z.array(ActivityAiActionItemSchema),
  confidence: z.number().min(0).max(1),
});
export type ActivityAiExtractResult = z.infer<typeof ActivityAiExtractResultSchema>;

export const IntentSentimentSchema = z.object({
  enabled: z.boolean(),
  intentLabels: z.array(
    z.enum(["question", "interested", "pricing", "negotiation", "objection", "support", "unknown"])
  ),
  sentiment: z.enum(["positive", "neutral", "negative", "mixed"]),
  confidence: z.number().min(0).max(1),
});
export type IntentSentiment = z.infer<typeof IntentSentimentSchema>;

export const GetDealAiInsightsInputSchema = z.object({
  dealId: z.string(),
  forceRefresh: z.boolean().optional(),
  workspaceLanguage: z.string().optional(),
});
export type GetDealAiInsightsInput = z.infer<typeof GetDealAiInsightsInputSchema>;

export const GetDealAiInsightsOutputSchema = z.object({
  insights: DealAiInsightsSchema,
  health: DealAiHealthSchema,
});
export type GetDealAiInsightsOutput = z.infer<typeof GetDealAiInsightsOutputSchema>;

export const GetDealAiRecommendationsInputSchema = z.object({
  dealId: z.string(),
  forceRefresh: z.boolean().optional(),
  workspaceLanguage: z.string().optional(),
});
export type GetDealAiRecommendationsInput = z.infer<typeof GetDealAiRecommendationsInputSchema>;

export const GetDealAiRecommendationsOutputSchema = z.object({
  recommendations: z.array(DealAiRecommendationSchema),
  generatedAt: utcInstantSchema,
});
export type GetDealAiRecommendationsOutput = z.infer<typeof GetDealAiRecommendationsOutputSchema>;

export const DraftDealMessageInputSchema = z.object({
  channel: z.string(),
  personalizeWithTimeline: z.boolean().default(true),
  translateToWorkspaceLanguage: z.boolean().default(false),
  workspaceLanguage: z.string().optional(),
});
export type DraftDealMessageInput = z.infer<typeof DraftDealMessageInputSchema>;

export const DraftDealMessageOutputSchema = z.object({
  draft: CrmMessageDraftSchema,
});
export type DraftDealMessageOutput = z.infer<typeof DraftDealMessageOutputSchema>;

export const ActivityAiParseInputSchema = z.object({
  description: z.string().min(1),
  workspaceLanguage: z.string().optional(),
});
export type ActivityAiParseInput = z.infer<typeof ActivityAiParseInputSchema>;

export const ActivityAiParseOutputSchema = z.object({
  result: ActivityAiParseResultSchema,
  applyToolCard: CreateActivityToolCardSchema.optional(),
});
export type ActivityAiParseOutput = z.infer<typeof ActivityAiParseOutputSchema>;

export const ActivityAiExtractInputSchema = z.object({
  notes: z.string().min(1),
  workspaceLanguage: z.string().optional(),
});
export type ActivityAiExtractInput = z.infer<typeof ActivityAiExtractInputSchema>;

export const ActivityAiExtractOutputSchema = z.object({
  result: ActivityAiExtractResultSchema,
  followUpToolCards: z.array(CreateActivityToolCardSchema),
});
export type ActivityAiExtractOutput = z.infer<typeof ActivityAiExtractOutputSchema>;

export const CommunicationAiSummarizeInputSchema = z.object({
  activityId: z.string().optional(),
  dealId: z.string().optional(),
  body: z.string().min(1),
  channelKey: z.string().optional(),
  direction: z.enum(["INBOUND", "OUTBOUND"]).optional(),
  workspaceLanguage: z.string().optional(),
});
export type CommunicationAiSummarizeInput = z.infer<typeof CommunicationAiSummarizeInputSchema>;

export const CommunicationAiSummarizeOutputSchema = z.object({
  result: ActivityAiExtractResultSchema,
  followUpToolCards: z.array(CreateActivityToolCardSchema),
  intentSentiment: IntentSentimentSchema.nullable(),
});
export type CommunicationAiSummarizeOutput = z.infer<typeof CommunicationAiSummarizeOutputSchema>;

export const CrmAiSettingsSchema = z.object({
  aiEnabled: z.boolean().default(false),
  intentSentimentEnabled: z.boolean().default(false),
});
export type CrmAiSettings = z.infer<typeof CrmAiSettingsSchema>;

export const GetCrmAiSettingsOutputSchema = z.object({
  settings: CrmAiSettingsSchema,
});
export type GetCrmAiSettingsOutput = z.infer<typeof GetCrmAiSettingsOutputSchema>;

export const UpdateCrmAiSettingsInputSchema = z.object({
  aiEnabled: z.boolean().optional(),
  intentSentimentEnabled: z.boolean().optional(),
});
export type UpdateCrmAiSettingsInput = z.infer<typeof UpdateCrmAiSettingsInputSchema>;

export const UpdateCrmAiSettingsOutputSchema = z.object({
  settings: CrmAiSettingsSchema,
});
export type UpdateCrmAiSettingsOutput = z.infer<typeof UpdateCrmAiSettingsOutputSchema>;
