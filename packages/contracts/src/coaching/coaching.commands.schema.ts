import { z } from "zod";
import {
  CoachingAnswerPayloadSchema,
  CoachingEngagementDetailDtoSchema,
  CoachingEngagementDtoSchema,
  CoachingOfferInputSchema,
  CoachingPublicQuestionnaireSchema,
  CoachingSessionDtoSchema,
} from "./coaching.types";

export const BookCoachingEngagementInputSchema = z.object({
  clientPartyId: z.string().min(1),
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
  successPath: z.string().optional(),
  cancelPath: z.string().optional(),
});
export const CreateCoachingCheckoutSessionOutputSchema = z.object({
  checkoutUrl: z.string().url(),
  sessionId: z.string(),
});
export type CreateCoachingCheckoutSessionInput = z.infer<
  typeof CreateCoachingCheckoutSessionInputSchema
>;
export type CreateCoachingCheckoutSessionOutput = z.infer<
  typeof CreateCoachingCheckoutSessionOutputSchema
>;

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
