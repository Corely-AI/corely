import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";
import { TaxEurStatementDtoSchema } from "./get-tax-eur-statement.schema";

export const IncomeTaxDraftYearSchema = z.number().int().min(2000).max(2100);
export type IncomeTaxDraftYear = z.infer<typeof IncomeTaxDraftYearSchema>;

export const IncomeTaxDraftStatusSchema = z.enum(["DRAFT", "IN_PROGRESS", "READY", "SUBMITTED"]);
export type IncomeTaxDraftStatus = z.infer<typeof IncomeTaxDraftStatusSchema>;

export const IncomeTaxDraftJurisdictionSchema = z.literal("DE");
export type IncomeTaxDraftJurisdiction = z.infer<typeof IncomeTaxDraftJurisdictionSchema>;

export const IncomeTaxDraftStrategySchema = z.literal("PERSONAL");
export type IncomeTaxDraftStrategy = z.infer<typeof IncomeTaxDraftStrategySchema>;

export const IncomeTaxDraftQuestionTypeSchema = z.enum(["MONEY_CENTS", "BOOLEAN", "TEXT"]);
export type IncomeTaxDraftQuestionType = z.infer<typeof IncomeTaxDraftQuestionTypeSchema>;

export const IncomeTaxDraftAnswerValueSchema = z.union([
  z.number().int(),
  z.boolean(),
  z.string().min(1),
]);
export type IncomeTaxDraftAnswerValue = z.infer<typeof IncomeTaxDraftAnswerValueSchema>;

export const IncomeTaxDraftInterviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  answer: IncomeTaxDraftAnswerValueSchema,
  evidenceRefs: z.array(z.string().min(1)).default([]),
  confirmedByUser: z.boolean(),
  answeredAt: utcInstantSchema,
});
export type IncomeTaxDraftInterviewAnswer = z.infer<typeof IncomeTaxDraftInterviewAnswerSchema>;

export const IncomeTaxDraftInterviewQuestionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  type: IncomeTaxDraftQuestionTypeSchema,
  required: z.boolean().default(true),
  answer: IncomeTaxDraftInterviewAnswerSchema.optional(),
});
export type IncomeTaxDraftInterviewQuestion = z.infer<typeof IncomeTaxDraftInterviewQuestionSchema>;

export const IncomeTaxDraftChecklistSeveritySchema = z.enum(["BLOCKER", "WARNING", "INFO"]);
export type IncomeTaxDraftChecklistSeverity = z.infer<typeof IncomeTaxDraftChecklistSeveritySchema>;

export const IncomeTaxDraftChecklistItemSchema = z.object({
  id: z.string().min(1),
  severity: IncomeTaxDraftChecklistSeveritySchema,
  message: z.string().min(1),
  actionId: z.string().optional(),
});
export type IncomeTaxDraftChecklistItem = z.infer<typeof IncomeTaxDraftChecklistItemSchema>;

export const IncomeTaxDraftChecklistSchema = z.object({
  isComplete: z.boolean(),
  nextQuestionId: z.string().nullable(),
  items: z.array(IncomeTaxDraftChecklistItemSchema).default([]),
});
export type IncomeTaxDraftChecklist = z.infer<typeof IncomeTaxDraftChecklistSchema>;

export const IncomeTaxDraftComputedSchema = z.object({
  incomeCents: z.number().int(),
  expenseCents: z.number().int(),
  profitCents: z.number().int(),
  deductionsCents: z.number().int(),
  taxableIncomeCents: z.number().int(),
  estimatedIncomeTaxDueCents: z.number().int(),
  computedAt: utcInstantSchema,
});
export type IncomeTaxDraftComputed = z.infer<typeof IncomeTaxDraftComputedSchema>;

export const IncomeTaxDraftNextActionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  blocking: z.boolean().default(false),
});
export type IncomeTaxDraftNextAction = z.infer<typeof IncomeTaxDraftNextActionSchema>;

export const IncomeTaxDraftSubmissionChannelSchema = z.enum(["ELSTER_MANUAL", "ADVISOR", "OTHER"]);
export type IncomeTaxDraftSubmissionChannel = z.infer<typeof IncomeTaxDraftSubmissionChannelSchema>;

export const IncomeTaxDraftSubmissionSchema = z.object({
  channel: IncomeTaxDraftSubmissionChannelSchema,
  referenceId: z.string().nullable(),
  submittedAt: utcInstantSchema,
  notes: z.string().nullable(),
});
export type IncomeTaxDraftSubmission = z.infer<typeof IncomeTaxDraftSubmissionSchema>;

export const IncomeTaxDraftSummarySchema = z.object({
  draftId: z.string(),
  year: IncomeTaxDraftYearSchema,
  status: IncomeTaxDraftStatusSchema,
  jurisdiction: IncomeTaxDraftJurisdictionSchema,
  strategy: IncomeTaxDraftStrategySchema,
  currency: z.string().min(3).max(3),
  incomeCents: z.number().int(),
  expenseCents: z.number().int(),
  profitCents: z.number().int(),
  taxableIncomeCents: z.number().int(),
  estimatedIncomeTaxDueCents: z.number().int(),
  checklist: IncomeTaxDraftChecklistSchema,
  updatedAt: utcInstantSchema,
});
export type IncomeTaxDraftSummary = z.infer<typeof IncomeTaxDraftSummarySchema>;

export const IncomeTaxDraftDtoSchema = z.object({
  draftId: z.string(),
  year: IncomeTaxDraftYearSchema,
  status: IncomeTaxDraftStatusSchema,
  jurisdiction: IncomeTaxDraftJurisdictionSchema,
  strategy: IncomeTaxDraftStrategySchema,
  currency: z.string().min(3).max(3),
  interviewQuestions: z.array(IncomeTaxDraftInterviewQuestionSchema),
  eurStatement: TaxEurStatementDtoSchema.nullable(),
  computed: IncomeTaxDraftComputedSchema.nullable(),
  checklist: IncomeTaxDraftChecklistSchema,
  submission: IncomeTaxDraftSubmissionSchema.nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type IncomeTaxDraftDto = z.infer<typeof IncomeTaxDraftDtoSchema>;

export const IncomeTaxDraftMutationOutputSchema = z.object({
  draft: IncomeTaxDraftDtoSchema,
  draftSummary: IncomeTaxDraftSummarySchema,
  nextRequiredActions: z.array(IncomeTaxDraftNextActionSchema),
});
export type IncomeTaxDraftMutationOutput = z.infer<typeof IncomeTaxDraftMutationOutputSchema>;

export const CreateIncomeTaxDraftInputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
});
export type CreateIncomeTaxDraftInput = z.infer<typeof CreateIncomeTaxDraftInputSchema>;

export const CreateIncomeTaxDraftOutputSchema = z.object({
  draftId: z.string(),
  year: IncomeTaxDraftYearSchema,
  status: IncomeTaxDraftStatusSchema,
  draftSummary: IncomeTaxDraftSummarySchema,
  nextRequiredActions: z.array(IncomeTaxDraftNextActionSchema),
});
export type CreateIncomeTaxDraftOutput = z.infer<typeof CreateIncomeTaxDraftOutputSchema>;

export const GetIncomeTaxDraftOutputSchema = z.object({
  draft: IncomeTaxDraftDtoSchema,
});
export type GetIncomeTaxDraftOutput = z.infer<typeof GetIncomeTaxDraftOutputSchema>;

export const IncomeTaxDraftIdParamSchema = z.object({
  draftId: z.string().min(1),
});
export type IncomeTaxDraftIdParam = z.infer<typeof IncomeTaxDraftIdParamSchema>;

export const GenerateIncomeTaxDraftEurOutputSchema = IncomeTaxDraftMutationOutputSchema;
export type GenerateIncomeTaxDraftEurOutput = z.infer<typeof GenerateIncomeTaxDraftEurOutputSchema>;

export const RecomputeIncomeTaxDraftOutputSchema = IncomeTaxDraftMutationOutputSchema;
export type RecomputeIncomeTaxDraftOutput = z.infer<typeof RecomputeIncomeTaxDraftOutputSchema>;

export const GetIncomeTaxDraftChecklistOutputSchema = z.object({
  draftId: z.string(),
  checklist: IncomeTaxDraftChecklistSchema,
  nextRequiredActions: z.array(IncomeTaxDraftNextActionSchema),
});
export type GetIncomeTaxDraftChecklistOutput = z.infer<
  typeof GetIncomeTaxDraftChecklistOutputSchema
>;

export const AnswerIncomeTaxDraftInterviewInputSchema = z.object({
  questionId: z.string().min(1),
  answer: IncomeTaxDraftAnswerValueSchema,
  evidenceRefs: z.array(z.string().min(1)).optional(),
  confirmedByUser: z.boolean(),
});
export type AnswerIncomeTaxDraftInterviewInput = z.infer<
  typeof AnswerIncomeTaxDraftInterviewInputSchema
>;

export const AnswerIncomeTaxDraftInterviewOutputSchema = IncomeTaxDraftMutationOutputSchema;
export type AnswerIncomeTaxDraftInterviewOutput = z.infer<
  typeof AnswerIncomeTaxDraftInterviewOutputSchema
>;

export const IncomeTaxDraftPdfExportStatusSchema = z.enum(["PENDING", "READY"]);
export type IncomeTaxDraftPdfExportStatus = z.infer<typeof IncomeTaxDraftPdfExportStatusSchema>;

export const StartIncomeTaxDraftPdfExportOutputSchema = z.object({
  exportId: z.string(),
  status: IncomeTaxDraftPdfExportStatusSchema,
  downloadUrl: z.string().optional(),
  expiresAt: utcInstantSchema.optional(),
  retryAfterMs: z.number().int().positive().optional(),
});
export type StartIncomeTaxDraftPdfExportOutput = z.infer<
  typeof StartIncomeTaxDraftPdfExportOutputSchema
>;

export const PollIncomeTaxDraftPdfExportOutputSchema = StartIncomeTaxDraftPdfExportOutputSchema;
export type PollIncomeTaxDraftPdfExportOutput = z.infer<
  typeof PollIncomeTaxDraftPdfExportOutputSchema
>;

export const PollIncomeTaxDraftPdfExportInputSchema = z.object({
  exportId: z.string().min(1),
});
export type PollIncomeTaxDraftPdfExportInput = z.infer<
  typeof PollIncomeTaxDraftPdfExportInputSchema
>;

export const ConfirmIncomeTaxDraftSubmissionInputSchema = z.object({
  channel: IncomeTaxDraftSubmissionChannelSchema,
  referenceId: z.string().trim().min(1).optional(),
  submittedAt: utcInstantSchema.optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type ConfirmIncomeTaxDraftSubmissionInput = z.infer<
  typeof ConfirmIncomeTaxDraftSubmissionInputSchema
>;

export const ConfirmIncomeTaxDraftSubmissionOutputSchema = IncomeTaxDraftMutationOutputSchema;
export type ConfirmIncomeTaxDraftSubmissionOutput = z.infer<
  typeof ConfirmIncomeTaxDraftSubmissionOutputSchema
>;
