import { z } from "zod";

// ─── Step Types ─────────────────────────────────────────────────────────────

export const OnboardingStepTypeSchema = z.enum([
  "welcome",
  "language",
  "business-basics",
  "workflow-source",
  "opening-balance",
  "first-entries",
  "first-receipt",
  "today-status",
  "daily-closing",
  "post-value",
]);
export type OnboardingStepType = z.infer<typeof OnboardingStepTypeSchema>;

// ─── Branching Rules ─────────────────────────────────────────────────────────

export const BranchingRuleSchema = z.object({
  /** The answer field to check (e.g. "workflowSource") */
  field: z.string(),
  /** The value to match (e.g. "paper") */
  value: z.unknown(),
  /** Override the title for this step when condition matches */
  titleOverride: z.record(z.string()).optional(),
  /** Override description copy when condition matches */
  descriptionOverride: z.record(z.string()).optional(),
  /** Next step id override */
  nextStepId: z.string().optional(),
});
export type BranchingRule = z.infer<typeof BranchingRuleSchema>;

// ─── Step Config ─────────────────────────────────────────────────────────────

export const OnboardingStepConfigSchema = z.object({
  id: z.string().min(1),
  type: OnboardingStepTypeSchema,
  /** Localised title strings keyed by locale code (e.g. "de", "en", "vi") */
  title: z.record(z.string()),
  /** Localised subtitle / description */
  description: z.record(z.string()),
  /** Primary CTA label per locale */
  ctaLabel: z.record(z.string()).optional(),
  /** Secondary (skip) CTA label per locale */
  skipLabel: z.record(z.string()).optional(),
  /** Whether the user may skip this step */
  skippable: z.boolean().default(false),
  /** Whether the step is optional (can be deferred without skipping) */
  optional: z.boolean().default(false),
  /**
   * How the step declares itself complete:
   * - "explicit"     → user presses CTA
   * - "field-filled" → a required form field is non-empty
   * - "automatic"    → completed as soon as it is rendered
   */
  completionCondition: z.enum(["explicit", "field-filled", "automatic"]).default("explicit"),
  /** Context string sent to AI helper when this step is active */
  aiHelpContext: z.string().optional(),
  /** ID of next step (linear default) */
  nextStepId: z.string().optional(),
  /** Conditional branching based on prior answers */
  branchingRules: z.array(BranchingRuleSchema).optional(),
  /** Key used to render this step's checklist item label */
  checklistItemKey: z.string().optional(),
  /** Whether this step satisfies the "first value" milestone */
  isFirstValueMilestone: z.boolean().default(false),
  /** Whether this step satisfies the "first close" milestone */
  isFirstCloseMilestone: z.boolean().default(false),
});
export type OnboardingStepConfig = z.infer<typeof OnboardingStepConfigSchema>;

// ─── Checklist Item ──────────────────────────────────────────────────────────

export const ChecklistItemConfigSchema = z.object({
  id: z.string().min(1),
  /** Step this item tracks (may track multiple steps via stepIds) */
  stepId: z.string().optional(),
  stepIds: z.array(z.string()).optional(),
  label: z.record(z.string()),
  /** Route to deep-link to when user clicks this item */
  deepLinkRoute: z.string().optional(),
  optional: z.boolean().default(false),
});
export type ChecklistItemConfig = z.infer<typeof ChecklistItemConfigSchema>;

// ─── Journey Config ──────────────────────────────────────────────────────────

export const OnboardingJourneyConfigSchema = z.object({
  /** e.g. "cash-management" */
  moduleKey: z.string().min(1),
  /** e.g. "cash-management-v1" — allows multiple journeys per module */
  journeyKey: z.string().min(1),
  title: z.record(z.string()),
  description: z.record(z.string()),
  supportedLocales: z.array(z.string()).min(1),
  defaultLocale: z.string().default("en"),
  steps: z.array(OnboardingStepConfigSchema).min(1),
  checklistItems: z.array(ChecklistItemConfigSchema),
  /** Analytics namespace prefix for events (e.g. "onboarding.cash-management") */
  analyticsPrefix: z.string().optional(),
  /** Feature flags required for this journey */
  featureFlags: z.array(z.string()).optional(),
});
export type OnboardingJourneyConfig = z.infer<typeof OnboardingJourneyConfigSchema>;
