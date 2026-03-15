import { z } from "zod";

// ─── Step Status ─────────────────────────────────────────────────────────────

export const OnboardingStepStatusSchema = z.enum([
  "pending",
  "in-progress",
  "completed",
  "skipped",
]);
export type OnboardingStepStatus = z.infer<typeof OnboardingStepStatusSchema>;

// ─── Step State ───────────────────────────────────────────────────────────────

export const OnboardingStepStateSchema = z.object({
  stepId: z.string(),
  status: OnboardingStepStatusSchema,
  completedAt: z.string().optional(),
  skippedAt: z.string().optional(),
  /** Answers provided at this step — e.g. { workflowSource: "paper" } */
  answers: z.record(z.unknown()).optional(),
  /** Arbitrary metadata (e.g. IDs of created entities) */
  meta: z.record(z.unknown()).optional(),
});
export type OnboardingStepState = z.infer<typeof OnboardingStepStateSchema>;

// ─── Analytics Event ─────────────────────────────────────────────────────────

export const OnboardingAnalyticsEventSchema = z.object({
  event: z.string(),
  stepId: z.string().optional(),
  locale: z.string().optional(),
  meta: z.record(z.unknown()).optional(),
  occurredAt: z.string(),
});
export type OnboardingAnalyticsEvent = z.infer<typeof OnboardingAnalyticsEventSchema>;

// ─── Journey Progress ─────────────────────────────────────────────────────────

export const OnboardingProgressSchema = z.object({
  journeyKey: z.string(),
  moduleKey: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  /** Selected locale (e.g. "de", "en", "vi") */
  locale: z.string().default("en"),
  /** The step the user is currently on */
  currentStepId: z.string(),
  /** Per-step state keyed by stepId */
  steps: z.record(OnboardingStepStateSchema),
  /** Did the user see the "today's cash status" screen with real data */
  reachedFirstValue: z.boolean().default(false),
  /** Did the user ever close a day */
  reachedFirstClose: z.boolean().default(false),
  /** Source of current cash management workflow (from workflow-source step) */
  workflowSource: z.string().optional(),
  startedAt: z.string(),
  lastActivityAt: z.string(),
  completedAt: z.string().optional(),
  /** True when user chose to dismiss/skip the journey entirely */
  dismissed: z.boolean().default(false),
  /** IDs of entities created during onboarding (register, entries, etc.) */
  createdEntityIds: z.record(z.string()).optional(),
});
export type OnboardingProgress = z.infer<typeof OnboardingProgressSchema>;

// ─── API Contracts ────────────────────────────────────────────────────────────

export const GetOnboardingProgressOutputSchema = z.object({
  found: z.boolean(),
  progress: OnboardingProgressSchema.optional(),
});
export type GetOnboardingProgressOutput = z.infer<typeof GetOnboardingProgressOutputSchema>;

export const UpsertOnboardingStepInputSchema = z.object({
  journeyKey: z.string(),
  moduleKey: z.string(),
  stepId: z.string(),
  status: OnboardingStepStatusSchema,
  answers: z.record(z.unknown()).optional(),
  meta: z.record(z.unknown()).optional(),
  locale: z.string().optional(),
  /** New currentStepId after this step (if advancing) */
  nextStepId: z.string().optional(),
  reachedFirstValue: z.boolean().optional(),
  reachedFirstClose: z.boolean().optional(),
  workflowSource: z.string().optional(),
  createdEntityIds: z.record(z.string()).optional(),
  idempotencyKey: z.string().optional(),
});
export type UpsertOnboardingStepInput = z.infer<typeof UpsertOnboardingStepInputSchema>;

export const CompleteOnboardingInputSchema = z.object({
  journeyKey: z.string(),
  moduleKey: z.string(),
  idempotencyKey: z.string().optional(),
});
export type CompleteOnboardingInput = z.infer<typeof CompleteOnboardingInputSchema>;

export const DismissOnboardingInputSchema = z.object({
  journeyKey: z.string(),
  moduleKey: z.string(),
  idempotencyKey: z.string().optional(),
});
export type DismissOnboardingInput = z.infer<typeof DismissOnboardingInputSchema>;
