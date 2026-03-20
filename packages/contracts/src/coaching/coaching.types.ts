import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { utcInstantSchema } from "../shared/local-date.schema";
import { DocumentDtoSchema } from "../documents/document.types";

export const LocalizedTextSchema = z.record(z.string().min(1), z.string());
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const CoachingEngagementStatusSchema = z.enum([
  "draft",
  "pending_payment",
  "pending_signature",
  "confirmed",
  "prep_pending",
  "ready",
  "session_done",
  "debrief_pending",
  "completed",
  "archived",
]);
export type CoachingEngagementStatus = z.infer<typeof CoachingEngagementStatusSchema>;

export const CoachingPaymentStatusSchema = z.enum([
  "not_required",
  "pending",
  "captured",
  "failed",
]);
export type CoachingPaymentStatus = z.infer<typeof CoachingPaymentStatusSchema>;

export const CoachingContractStatusSchema = z.enum(["not_required", "pending", "signed", "failed"]);
export type CoachingContractStatus = z.infer<typeof CoachingContractStatusSchema>;

export const CoachingSessionStatusSchema = z.enum(["scheduled", "completed", "cancelled"]);
export type CoachingSessionStatus = z.infer<typeof CoachingSessionStatusSchema>;

export const CoachingQuestionTypeSchema = z.enum([
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "boolean",
]);
export type CoachingQuestionType = z.infer<typeof CoachingQuestionTypeSchema>;

export const CoachingArtifactKindSchema = z.enum([
  "invoice_pdf",
  "contract_draft",
  "contract_signed",
  "prep_response",
  "debrief_response",
  "summary_note",
  "export_bundle",
]);
export type CoachingArtifactKind = z.infer<typeof CoachingArtifactKindSchema>;

export const CoachingQuestionOptionSchema = z.object({
  value: z.string(),
  label: LocalizedTextSchema,
});
export type CoachingQuestionOption = z.infer<typeof CoachingQuestionOptionSchema>;

export const CoachingQuestionSchema = z.object({
  key: z.string().min(1),
  label: LocalizedTextSchema,
  helpText: LocalizedTextSchema.optional(),
  type: CoachingQuestionTypeSchema,
  required: z.boolean().default(false),
  options: z.array(CoachingQuestionOptionSchema).default([]),
});
export type CoachingQuestion = z.infer<typeof CoachingQuestionSchema>;

export const CoachingQuestionnaireTemplateSchema = z.object({
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  questions: z.array(CoachingQuestionSchema).default([]),
});
export type CoachingQuestionnaireTemplate = z.infer<typeof CoachingQuestionnaireTemplateSchema>;

export const CoachingOfferInputSchema = z.object({
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  currency: z.string().length(3).default("EUR"),
  priceCents: z.number().int().nonnegative(),
  sessionDurationMinutes: z.number().int().positive(),
  contractRequired: z.boolean().default(true),
  paymentRequired: z.boolean().default(true),
  localeDefault: z.string().default("en"),
  contractLabel: LocalizedTextSchema.optional(),
  prepFormTemplate: CoachingQuestionnaireTemplateSchema.optional().nullable(),
  debriefTemplate: CoachingQuestionnaireTemplateSchema.optional().nullable(),
});
export type CoachingOfferInput = z.infer<typeof CoachingOfferInputSchema>;

export const CoachingOfferDtoSchema = CoachingOfferInputSchema.extend({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CoachingOfferDto = z.infer<typeof CoachingOfferDtoSchema>;

export const CoachingArtifactDtoSchema = z.object({
  kind: CoachingArtifactKindSchema,
  title: z.string(),
  document: DocumentDtoSchema,
  entityType: z.enum(["engagement", "session", "party"]),
  entityId: z.string(),
  createdAt: utcInstantSchema,
});
export type CoachingArtifactDto = z.infer<typeof CoachingArtifactDtoSchema>;

export const CoachingTimelineEntryDtoSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  stateFrom: CoachingEngagementStatusSchema.nullable(),
  stateTo: CoachingEngagementStatusSchema.nullable(),
  occurredAt: utcInstantSchema,
  actorUserId: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type CoachingTimelineEntryDto = z.infer<typeof CoachingTimelineEntryDtoSchema>;

export const CoachingSessionDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  engagementId: z.string(),
  status: CoachingSessionStatusSchema,
  startAt: utcInstantSchema,
  endAt: utcInstantSchema,
  meetingProvider: z.string().nullable().optional(),
  meetingLink: z.string().nullable().optional(),
  meetingIssuedAt: utcInstantSchema.nullable().optional(),
  prepRequestedAt: utcInstantSchema.nullable().optional(),
  prepSubmittedAt: utcInstantSchema.nullable().optional(),
  prepDocumentId: z.string().nullable().optional(),
  debriefRequestedAt: utcInstantSchema.nullable().optional(),
  debriefSubmittedAt: utcInstantSchema.nullable().optional(),
  debriefDocumentId: z.string().nullable().optional(),
  completedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CoachingSessionDto = z.infer<typeof CoachingSessionDtoSchema>;

export const CoachingEngagementDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  offer: CoachingOfferDtoSchema,
  clientPartyId: z.string(),
  coachPartyId: z.string().nullable().optional(),
  coachUserId: z.string(),
  locale: z.string(),
  status: CoachingEngagementStatusSchema,
  paymentStatus: CoachingPaymentStatusSchema,
  contractStatus: CoachingContractStatusSchema,
  invoiceId: z.string().nullable().optional(),
  stripeCheckoutSessionId: z.string().nullable().optional(),
  stripeCheckoutUrl: z.string().url().nullable().optional(),
  contractDraftDocumentId: z.string().nullable().optional(),
  signedContractDocumentId: z.string().nullable().optional(),
  exportedBundleDocumentId: z.string().nullable().optional(),
  latestSummary: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CoachingEngagementDto = z.infer<typeof CoachingEngagementDtoSchema>;

export const CoachingEngagementDetailDtoSchema = z.object({
  engagement: CoachingEngagementDtoSchema,
  sessions: z.array(CoachingSessionDtoSchema),
  artifacts: z.array(CoachingArtifactDtoSchema),
  timeline: z.array(CoachingTimelineEntryDtoSchema),
  aiSummary: z.string().nullable(),
});
export type CoachingEngagementDetailDto = z.infer<typeof CoachingEngagementDetailDtoSchema>;

export const CoachingPublicQuestionnaireSchema = z.object({
  sessionId: z.string(),
  engagementId: z.string(),
  locale: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  questions: z.array(
    CoachingQuestionSchema.extend({
      labelResolved: z.string(),
      helpTextResolved: z.string().nullable().optional(),
      optionsResolved: z.array(
        CoachingQuestionOptionSchema.extend({
          labelResolved: z.string(),
        })
      ),
    })
  ),
});
export type CoachingPublicQuestionnaire = z.infer<typeof CoachingPublicQuestionnaireSchema>;

export const CoachingAnswerPayloadSchema = z.record(z.string(), z.unknown());
export type CoachingAnswerPayload = z.infer<typeof CoachingAnswerPayloadSchema>;

export const ListCoachingEngagementsInputSchema = ListQuerySchema.extend({
  status: CoachingEngagementStatusSchema.optional(),
  coachUserId: z.string().optional(),
  clientPartyId: z.string().optional(),
});
export const ListCoachingEngagementsOutputSchema = createListResponseSchema(
  CoachingEngagementDtoSchema
);
export type ListCoachingEngagementsInput = z.infer<typeof ListCoachingEngagementsInputSchema>;
export type ListCoachingEngagementsOutput = z.infer<typeof ListCoachingEngagementsOutputSchema>;

export const ListCoachingSessionsInputSchema = ListQuerySchema.extend({
  engagementId: z.string().optional(),
  status: CoachingSessionStatusSchema.optional(),
});
export const ListCoachingSessionsOutputSchema = createListResponseSchema(CoachingSessionDtoSchema);
export type ListCoachingSessionsInput = z.infer<typeof ListCoachingSessionsInputSchema>;
export type ListCoachingSessionsOutput = z.infer<typeof ListCoachingSessionsOutputSchema>;
