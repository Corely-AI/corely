import { z } from "zod";
import {
  ArchiveCoachingOfferInputSchema,
  ArchiveCoachingOfferOutputSchema,
  CoachingBookingHoldDtoSchema,
  CoachingPaymentDtoSchema,
  CoachingPublicAvailabilityOutputSchema,
  CoachingAnswerPayloadSchema,
  CreateCoachingOfferInputSchema,
  CreateCoachingOfferOutputSchema,
  CoachingEngagementDetailDtoSchema,
  CoachingEngagementDtoSchema,
  CoachingOfferInputSchema,
  CoachingPublicContractSchema,
  CoachingPublicQuestionnaireSchema,
  CoachingSessionDtoSchema,
  GetCoachingOfferInputSchema,
  GetCoachingOfferOutputSchema,
  ListCoachingOffersInputSchema,
  ListCoachingOffersOutputSchema,
  UpdateCoachingOfferInputSchema,
  UpdateCoachingOfferOutputSchema,
} from "./coaching.types";

export const BookCoachingEngagementInputSchema = z.object({
  clientPartyId: z.string().min(1),
  bookingHoldId: z.string().min(1).optional(),
  coachUserId: z.string().min(1),
  coachPartyId: z.string().optional(),
  locale: z.string().default("en"),
  offer: CoachingOfferInputSchema,
  session: z.object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    meetingProvider: z.string().optional(),
  }),
  legalEntityId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export const BookCoachingEngagementOutputSchema = z.object({
  engagement: CoachingEngagementDtoSchema,
  session: CoachingSessionDtoSchema,
});
export type BookCoachingEngagementInput = z.infer<typeof BookCoachingEngagementInputSchema>;
export type BookCoachingEngagementOutput = z.infer<typeof BookCoachingEngagementOutputSchema>;

export const GetCoachingEngagementInputSchema = z.object({
  engagementId: z.string().min(1),
});
export const GetCoachingEngagementOutputSchema = CoachingEngagementDetailDtoSchema;
export type GetCoachingEngagementInput = z.infer<typeof GetCoachingEngagementInputSchema>;
export type GetCoachingEngagementOutput = z.infer<typeof GetCoachingEngagementOutputSchema>;

export const CreateCoachingCheckoutSessionInputSchema = z.object({
  engagementId: z.string().min(1),
  paymentProvider: z.string().min(1).optional(),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});
export const CreateCoachingCheckoutSessionOutputSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
  payment: CoachingPaymentDtoSchema,
});
export type CreateCoachingCheckoutSessionInput = z.infer<
  typeof CreateCoachingCheckoutSessionInputSchema
>;
export type CreateCoachingCheckoutSessionOutput = z.infer<
  typeof CreateCoachingCheckoutSessionOutputSchema
>;

export const GetCoachingContractViewInputSchema = z.object({
  engagementId: z.string().min(1),
  token: z.string().min(1),
});
export const GetCoachingContractViewOutputSchema = CoachingPublicContractSchema;
export type GetCoachingContractViewInput = z.infer<typeof GetCoachingContractViewInputSchema>;
export type GetCoachingContractViewOutput = z.infer<typeof GetCoachingContractViewOutputSchema>;

export const SignCoachingContractInputSchema = z.object({
  engagementId: z.string().min(1),
  token: z.string().min(1),
  signerName: z.string().min(1),
  signerEmail: z.string().email().optional(),
});
export const SignCoachingContractOutputSchema = z.object({
  signed: z.literal(true),
  engagement: CoachingEngagementDtoSchema,
});
export type SignCoachingContractInput = z.infer<typeof SignCoachingContractInputSchema>;
export type SignCoachingContractOutput = z.infer<typeof SignCoachingContractOutputSchema>;

export const GetCoachingPrepFormInputSchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(1),
});
export const GetCoachingPrepFormOutputSchema = z.object({
  questionnaire: CoachingPublicQuestionnaireSchema,
});
export type GetCoachingPrepFormInput = z.infer<typeof GetCoachingPrepFormInputSchema>;
export type GetCoachingPrepFormOutput = z.infer<typeof GetCoachingPrepFormOutputSchema>;

export const SubmitCoachingPrepFormInputSchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(1),
  answers: CoachingAnswerPayloadSchema,
  submittedByName: z.string().optional(),
});
export const SubmitCoachingPrepFormOutputSchema = z.object({
  submitted: z.literal(true),
  session: CoachingSessionDtoSchema,
});
export type SubmitCoachingPrepFormInput = z.infer<typeof SubmitCoachingPrepFormInputSchema>;
export type SubmitCoachingPrepFormOutput = z.infer<typeof SubmitCoachingPrepFormOutputSchema>;

export const GetCoachingDebriefFormInputSchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(1),
});
export const GetCoachingDebriefFormOutputSchema = z.object({
  questionnaire: CoachingPublicQuestionnaireSchema,
});
export type GetCoachingDebriefFormInput = z.infer<typeof GetCoachingDebriefFormInputSchema>;
export type GetCoachingDebriefFormOutput = z.infer<typeof GetCoachingDebriefFormOutputSchema>;

export const SubmitCoachingDebriefInputSchema = z.object({
  sessionId: z.string().min(1),
  token: z.string().min(1),
  answers: CoachingAnswerPayloadSchema,
  submittedByName: z.string().optional(),
});
export const SubmitCoachingDebriefOutputSchema = z.object({
  submitted: z.literal(true),
  session: CoachingSessionDtoSchema,
  engagement: CoachingEngagementDtoSchema,
});
export type SubmitCoachingDebriefInput = z.infer<typeof SubmitCoachingDebriefInputSchema>;
export type SubmitCoachingDebriefOutput = z.infer<typeof SubmitCoachingDebriefOutputSchema>;

export const CompleteCoachingSessionInputSchema = z.object({
  sessionId: z.string().min(1),
  notes: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export const CompleteCoachingSessionOutputSchema = z.object({
  session: CoachingSessionDtoSchema,
  engagement: CoachingEngagementDtoSchema,
});
export type CompleteCoachingSessionInput = z.infer<typeof CompleteCoachingSessionInputSchema>;
export type CompleteCoachingSessionOutput = z.infer<typeof CompleteCoachingSessionOutputSchema>;

export const GenerateCoachingExportBundleInputSchema = z.object({
  engagementId: z.string().min(1),
  idempotencyKey: z.string().optional(),
});
export const GenerateCoachingExportBundleOutputSchema = z.object({
  documentId: z.string(),
  status: z.enum(["pending", "ready"]),
});
export type GenerateCoachingExportBundleInput = z.infer<
  typeof GenerateCoachingExportBundleInputSchema
>;
export type GenerateCoachingExportBundleOutput = z.infer<
  typeof GenerateCoachingExportBundleOutputSchema
>;

export const GetCoachingArtifactSummaryInputSchema = z.object({
  engagementId: z.string().min(1),
});
export const GetCoachingArtifactSummaryOutputSchema = z.object({
  summary: z.string(),
});
export type GetCoachingArtifactSummaryInput = z.infer<typeof GetCoachingArtifactSummaryInputSchema>;
export type GetCoachingArtifactSummaryOutput = z.infer<
  typeof GetCoachingArtifactSummaryOutputSchema
>;

export const GetCoachingPublicAvailabilityInputSchema = z.object({
  offerId: z.string().min(1),
  from: z.string().datetime(),
  to: z.string().datetime(),
  timezone: z.string().min(1).optional(),
});
export const GetCoachingPublicAvailabilityOutputSchema = CoachingPublicAvailabilityOutputSchema;
export type GetCoachingPublicAvailabilityInput = z.infer<
  typeof GetCoachingPublicAvailabilityInputSchema
>;
export type GetCoachingPublicAvailabilityOutput = z.infer<
  typeof GetCoachingPublicAvailabilityOutputSchema
>;

export const CreateCoachingBookingHoldInputSchema = z.object({
  offerId: z.string().min(1),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  bookedByName: z.string().optional(),
  bookedByEmail: z.string().email().optional(),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
});
export const CreateCoachingBookingHoldOutputSchema = z.object({
  hold: CoachingBookingHoldDtoSchema,
});
export type CreateCoachingBookingHoldInput = z.infer<typeof CreateCoachingBookingHoldInputSchema>;
export type CreateCoachingBookingHoldOutput = z.infer<typeof CreateCoachingBookingHoldOutputSchema>;

export const StartCoachingPublicBookingInputSchema = z.object({
  offerId: z.string().min(1),
  holdId: z.string().min(1),
  locale: z.string().default("en"),
  paymentProvider: z.string().min(1).optional(),
  client: z.object({
    displayName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});
export const StartCoachingPublicBookingOutputSchema = z.object({
  engagement: CoachingEngagementDtoSchema,
  session: CoachingSessionDtoSchema,
  payment: CoachingPaymentDtoSchema,
  checkoutUrl: z.string().url(),
});
export type StartCoachingPublicBookingInput = z.infer<
  typeof StartCoachingPublicBookingInputSchema
>;
export type StartCoachingPublicBookingOutput = z.infer<
  typeof StartCoachingPublicBookingOutputSchema
>;

export const CancelCoachingSessionInputSchema = z.object({
  sessionId: z.string().min(1),
  reason: z.string().max(2000).optional(),
});
export const CancelCoachingSessionOutputSchema = z.object({
  session: CoachingSessionDtoSchema,
});
export type CancelCoachingSessionInput = z.infer<typeof CancelCoachingSessionInputSchema>;
export type CancelCoachingSessionOutput = z.infer<typeof CancelCoachingSessionOutputSchema>;

export const RefundCoachingPaymentInputSchema = z.object({
  engagementId: z.string().min(1),
  paymentId: z.string().min(1).optional(),
  amountCents: z.number().int().positive().optional(),
  reason: z.string().max(1000).optional(),
});
export const RefundCoachingPaymentOutputSchema = z.object({
  payment: CoachingPaymentDtoSchema,
});
export type RefundCoachingPaymentInput = z.infer<typeof RefundCoachingPaymentInputSchema>;
export type RefundCoachingPaymentOutput = z.infer<typeof RefundCoachingPaymentOutputSchema>;

export const ResendCoachingInvoiceInputSchema = z.object({
  engagementId: z.string().min(1),
  to: z.string().email().optional(),
});
export const ResendCoachingInvoiceOutputSchema = z.object({
  invoiceId: z.string(),
  deliveryId: z.string(),
  status: z.enum(["QUEUED", "SENT", "DELIVERED", "BOUNCED", "FAILED", "DELAYED"]),
  to: z.string().email(),
});
export type ResendCoachingInvoiceInput = z.infer<typeof ResendCoachingInvoiceInputSchema>;
export type ResendCoachingInvoiceOutput = z.infer<typeof ResendCoachingInvoiceOutputSchema>;

export {
  CreateCoachingOfferInputSchema,
  CreateCoachingOfferOutputSchema,
  UpdateCoachingOfferInputSchema,
  UpdateCoachingOfferOutputSchema,
  ListCoachingOffersInputSchema,
  ListCoachingOffersOutputSchema,
  GetCoachingOfferInputSchema,
  GetCoachingOfferOutputSchema,
  ArchiveCoachingOfferInputSchema,
  ArchiveCoachingOfferOutputSchema,
};
