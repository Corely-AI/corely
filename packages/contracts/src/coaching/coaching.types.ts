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

export const CoachingPaymentProviderSchema = z.string().min(1);
export type CoachingPaymentProvider = z.infer<typeof CoachingPaymentProviderSchema>;

export const CoachingPaymentRecordStatusSchema = z.enum([
  "pending",
  "captured",
  "failed",
  "refunded",
]);
export type CoachingPaymentRecordStatus = z.infer<typeof CoachingPaymentRecordStatusSchema>;

export const CoachingContractStatusSchema = z.enum(["not_required", "pending", "signed", "failed"]);
export type CoachingContractStatus = z.infer<typeof CoachingContractStatusSchema>;

export const CoachingContractRequestStatusSchema = z.enum([
  "pending",
  "viewed",
  "signed",
  "failed",
]);
export type CoachingContractRequestStatus = z.infer<typeof CoachingContractRequestStatusSchema>;

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

export const CoachingMeetingTypeSchema = z.enum(["video", "phone", "in_person"]);
export type CoachingMeetingType = z.infer<typeof CoachingMeetingTypeSchema>;

export const CoachingAvailabilitySlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "HH:MM"),
});
export type CoachingAvailabilitySlot = z.infer<typeof CoachingAvailabilitySlotSchema>;

export const CoachingBlackoutIntervalSchema = z.object({
  startAt: z.string(),
  endAt: z.string(),
  reason: z.string().optional().nullable(),
});
export type CoachingBlackoutInterval = z.infer<typeof CoachingBlackoutIntervalSchema>;

export const CoachingAvailabilityRuleSchema = z.object({
  timezone: z.string().min(1).default("UTC"),
  weeklySlots: z.array(CoachingAvailabilitySlotSchema).default([]),
  blackouts: z.array(CoachingBlackoutIntervalSchema).default([]),
});
export type CoachingAvailabilityRule = z.infer<typeof CoachingAvailabilityRuleSchema>;

export const CoachingBookingRulesSchema = z.object({
  minNoticeHours: z.number().int().nonnegative().default(24),
  maxAdvanceDays: z.number().int().positive().default(60),
  bufferBeforeMinutes: z.number().int().nonnegative().default(0),
  bufferAfterMinutes: z.number().int().nonnegative().default(0),
});
export type CoachingBookingRules = z.infer<typeof CoachingBookingRulesSchema>;

export const CoachingOfferInputSchema = z.object({
  title: LocalizedTextSchema,
  description: LocalizedTextSchema.optional(),
  currency: z.string().length(3).default("EUR"),
  priceCents: z.number().int().nonnegative(),
  sessionDurationMinutes: z.number().int().positive(),
  meetingType: CoachingMeetingTypeSchema.default("video"),
  availabilityRule: CoachingAvailabilityRuleSchema.default({
    timezone: "UTC",
    weeklySlots: [],
    blackouts: [],
  }),
  bookingRules: CoachingBookingRulesSchema.default({
    minNoticeHours: 24,
    maxAdvanceDays: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
  }),
  contractRequired: z.boolean().default(true),
  paymentRequired: z.boolean().default(true),
  localeDefault: z.string().default("en"),
  contractTemplate: LocalizedTextSchema.optional().nullable(),
  contractLabel: LocalizedTextSchema.optional(),
  prepFormTemplate: CoachingQuestionnaireTemplateSchema.optional().nullable(),
  prepFormSendHoursBeforeSession: z.number().int().nonnegative().max(720).optional().nullable(),
  debriefTemplate: CoachingQuestionnaireTemplateSchema.optional().nullable(),
});
export type CoachingOfferInput = z.infer<typeof CoachingOfferInputSchema>;

export const CoachingOfferDtoSchema = CoachingOfferInputSchema.extend({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  coachUserId: z.string().min(1).nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CoachingOfferDto = z.infer<typeof CoachingOfferDtoSchema>;

export const CoachingPublicAvailableSlotSchema = z.object({
  startAt: utcInstantSchema,
  endAt: utcInstantSchema,
  displayStart: z.string(),
  displayEnd: z.string(),
});
export type CoachingPublicAvailableSlot = z.infer<typeof CoachingPublicAvailableSlotSchema>;

export const CoachingPublicAvailabilityOutputSchema = z.object({
  offerId: z.string(),
  offerTimezone: z.string(),
  displayTimezone: z.string(),
  slots: z.array(CoachingPublicAvailableSlotSchema),
});
export type CoachingPublicAvailabilityOutput = z.infer<
  typeof CoachingPublicAvailabilityOutputSchema
>;

export const CoachingBookingHoldStatusSchema = z.enum(["active", "expired", "cancelled"]);
export type CoachingBookingHoldStatus = z.infer<typeof CoachingBookingHoldStatusSchema>;

export const CoachingBookingHoldDtoSchema = z.object({
  id: z.string(),
  offerId: z.string(),
  coachUserId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  status: CoachingBookingHoldStatusSchema,
  startAt: utcInstantSchema,
  endAt: utcInstantSchema,
  expiresAt: utcInstantSchema,
  bookedByName: z.string().nullable().optional(),
  bookedByEmail: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CoachingBookingHoldDto = z.infer<typeof CoachingBookingHoldDtoSchema>;

export const CoachingPaymentDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string().nullable().optional(),
  engagementId: z.string(),
  sessionId: z.string().nullable().optional(),
  provider: CoachingPaymentProviderSchema,
  status: CoachingPaymentRecordStatusSchema,
  amountCents: z.number().int().nonnegative(),
  refundedAmountCents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  customerEmail: z.string().email().nullable().optional(),
  providerCheckoutSessionId: z.string().nullable().optional(),
  providerCheckoutUrl: z.string().url().nullable().optional(),
  providerPaymentRef: z.string().nullable().optional(),
  providerRefundRef: z.string().nullable().optional(),
  failureCode: z.string().nullable().optional(),
  failureMessage: z.string().nullable().optional(),
  checkoutCreatedAt: utcInstantSchema.nullable().optional(),
  capturedAt: utcInstantSchema.nullable().optional(),
  failedAt: utcInstantSchema.nullable().optional(),
  refundedAt: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CoachingPaymentDto = z.infer<typeof CoachingPaymentDtoSchema>;

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

export const CoachingContractRequestDtoSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: CoachingContractRequestStatusSchema,
  templateLocale: z.string(),
  contractTitle: z.string(),
  recipientName: z.string().nullable().optional(),
  recipientEmail: z.string().email().nullable().optional(),
  signerName: z.string().nullable().optional(),
  signerEmail: z.string().email().nullable().optional(),
  requestedAt: utcInstantSchema,
  deliveredAt: utcInstantSchema.nullable().optional(),
  viewedAt: utcInstantSchema.nullable().optional(),
  completedAt: utcInstantSchema.nullable().optional(),
  draftDocumentId: z.string(),
  signedDocumentId: z.string().nullable().optional(),
});
export type CoachingContractRequestDto = z.infer<typeof CoachingContractRequestDtoSchema>;

export const CoachingEngagementDetailDtoSchema = z.object({
  engagement: CoachingEngagementDtoSchema,
  contractRequest: CoachingContractRequestDtoSchema.nullable(),
  sessions: z.array(CoachingSessionDtoSchema),
  payments: z.array(CoachingPaymentDtoSchema),
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

export const CoachingPublicContractSchema = z.object({
  request: CoachingContractRequestDtoSchema,
  engagement: CoachingEngagementDtoSchema,
  contractBody: z.string(),
});
export type CoachingPublicContract = z.infer<typeof CoachingPublicContractSchema>;

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

export const CoachingOfferListItemDtoSchema = CoachingOfferDtoSchema;
export type CoachingOfferListItemDto = z.infer<typeof CoachingOfferListItemDtoSchema>;

export const CreateCoachingOfferInputSchema = CoachingOfferInputSchema.extend({
  title: LocalizedTextSchema.refine((value) => Object.keys(value).length > 0, {
    message: "At least one localized title is required",
  }),
  availabilityRule: CoachingAvailabilityRuleSchema.extend({
    weeklySlots: z
      .array(CoachingAvailabilitySlotSchema)
      .min(1, "At least one availability slot is required"),
  }),
  idempotencyKey: z.string().optional(),
});
export type CreateCoachingOfferInput = z.infer<typeof CreateCoachingOfferInputSchema>;

export const UpdateCoachingOfferInputSchema = CoachingOfferInputSchema.partial();
export type UpdateCoachingOfferInput = z.infer<typeof UpdateCoachingOfferInputSchema>;

const QueryBooleanSchema = z.preprocess((value) => {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}, z.boolean());

const QueryNumberSchema = z.preprocess((value) => {
  if (value == null || value === "") {
    return undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().int().positive());

export const ListCoachingOffersInputSchema = z.object({
  q: z.string().optional(),
  page: QueryNumberSchema.optional().default(1),
  pageSize: QueryNumberSchema.optional().default(20),
  includeArchived: QueryBooleanSchema.optional(),
});
export const ListCoachingOffersOutputSchema = createListResponseSchema(
  CoachingOfferListItemDtoSchema
);
export type ListCoachingOffersInput = z.infer<typeof ListCoachingOffersInputSchema>;
export type ListCoachingOffersOutput = z.infer<typeof ListCoachingOffersOutputSchema>;

export const GetCoachingOfferInputSchema = z.object({
  offerId: z.string().min(1),
});
export const GetCoachingOfferOutputSchema = z.object({
  offer: CoachingOfferDtoSchema,
});
export type GetCoachingOfferInput = z.infer<typeof GetCoachingOfferInputSchema>;
export type GetCoachingOfferOutput = z.infer<typeof GetCoachingOfferOutputSchema>;

export const CreateCoachingOfferOutputSchema = z.object({
  offer: CoachingOfferDtoSchema,
});
export type CreateCoachingOfferOutput = z.infer<typeof CreateCoachingOfferOutputSchema>;

export const UpdateCoachingOfferOutputSchema = z.object({
  offer: CoachingOfferDtoSchema,
});
export type UpdateCoachingOfferOutput = z.infer<typeof UpdateCoachingOfferOutputSchema>;

export const ArchiveCoachingOfferInputSchema = z.object({
  offerId: z.string().min(1),
});
export const ArchiveCoachingOfferOutputSchema = z.object({
  offer: CoachingOfferDtoSchema,
});
export type ArchiveCoachingOfferInput = z.infer<typeof ArchiveCoachingOfferInputSchema>;
export type ArchiveCoachingOfferOutput = z.infer<typeof ArchiveCoachingOfferOutputSchema>;
