/**
 * Germany-first (DE) Expense Deductibility Types
 *
 * These types describe the income-tax deductibility rules for expense categories.
 * Default ruleset: Germany (DE), effective 2026.
 * Tenants can override these rules in the future via configuration.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Rule discriminated union
// ---------------------------------------------------------------------------

/** 100 / 70 / 0 percent fixed deductible rule */
export const PercentRuleSchema = z.object({
  kind: z.literal("PERCENT"),
  percent: z.union([z.literal(0), z.literal(70), z.literal(100)]),
  /** i18n key for an optional user-facing note */
  notesI18nKey: z.string().optional(),
});
export type PercentRule = z.infer<typeof PercentRuleSchema>;

/** Gift threshold: €50 per recipient per calendar year; tracked per tenant */
export const GiftThresholdRuleSchema = z.object({
  kind: z.literal("GIFT_THRESHOLD_PER_RECIPIENT_YEAR"),
  /** Threshold in cents (default: 5000 = €50) */
  thresholdCents: z.number().int().positive().default(5000),
  currency: z.string().default("EUR"),
  /** Below threshold: 100% deductible */
  withinThresholdPercent: z.literal(100).default(100),
  /** Above threshold: 0% deductible (entire amount non-deductible) */
  overThresholdPercent: z.literal(0).default(0),
  requiresRecipient: z.literal(true).default(true),
});
export type GiftThresholdRule = z.infer<typeof GiftThresholdRuleSchema>;

/** Per-diem lump sum rule (travel meals, home office) */
export const PerDiemRuleSchema = z.object({
  kind: z.literal("PER_DIEM"),
  scheme: z.enum(["DE_TRAVEL_MEALS", "DE_HOME_OFFICE"]),
  computedBy: z.literal("app"),
});
export type PerDiemRule = z.infer<typeof PerDiemRuleSchema>;

/** Mixed-use: deductibility percentage depends on business-use proportion */
export const MixedUseRuleSchema = z.object({
  kind: z.literal("MIXED_USE"),
  requiresBusinessUsePercent: z.literal(true).default(true),
});
export type MixedUseRule = z.infer<typeof MixedUseRuleSchema>;

export const DeductibilityRuleSchema = z.discriminatedUnion("kind", [
  PercentRuleSchema,
  GiftThresholdRuleSchema,
  PerDiemRuleSchema,
  MixedUseRuleSchema,
]);
export type DeductibilityRule = z.infer<typeof DeductibilityRuleSchema>;

// ---------------------------------------------------------------------------
// Required fields in expense metadata
// ---------------------------------------------------------------------------

export const ExpenseCategoryRequiredFieldsSchema = z.object({
  /** Comma-separated list of attendees / participants */
  participants: z.boolean().optional(),
  /** Description of business occasion */
  occasion: z.boolean().optional(),
  /** Gift recipient name / identifier */
  recipient: z.boolean().optional(),
  /** 0-100 fraction of business use */
  businessUsePercent: z.boolean().optional(),
  /** Travel metadata (date, departure, return, absenceHours, country) */
  travelMeta: z.boolean().optional(),
  /** Number of home-office days */
  homeOfficeDays: z.boolean().optional(),
});
export type ExpenseCategoryRequiredFields = z.infer<typeof ExpenseCategoryRequiredFieldsSchema>;

// ---------------------------------------------------------------------------
// Category metadata (DE defaults built into the app)
// ---------------------------------------------------------------------------

export const ExpenseCategoryMetaSchema = z.object({
  /** Unique slug key matching what is stored on Expense.category */
  categoryKey: z.string(),
  labelI18nKey: z.string(),
  defaultDeductibilityRule: DeductibilityRuleSchema,
  requiresFields: ExpenseCategoryRequiredFieldsSchema,
});
export type ExpenseCategoryMeta = z.infer<typeof ExpenseCategoryMetaSchema>;

// ---------------------------------------------------------------------------
// Computed / stored deductibility result
// ---------------------------------------------------------------------------

/** Stored on the Expense record after computation */
export const ExpenseDeductibilityResultSchema = z.object({
  /** 0–100; null means "not yet computed" (e.g. missing required fields) */
  deductiblePercent: z.number().int().min(0).max(100).nullable(),
  /** Deductible amount in cents */
  deductibleAmountCents: z.number().int().nullable(),
  /** Non-deductible amount in cents */
  nonDeductibleAmountCents: z.number().int().nullable(),
  /** Stable identifier for the applied rule */
  ruleKind: z
    .enum(["PERCENT", "GIFT_THRESHOLD_PER_RECIPIENT_YEAR", "PER_DIEM", "MIXED_USE"])
    .nullable(),
  /** Serialised computation metadata (recipient, occasion, perDiemDays, etc.) */
  meta: z.record(z.unknown()).nullable(),
});
export type ExpenseDeductibilityResult = z.infer<typeof ExpenseDeductibilityResultSchema>;

// ---------------------------------------------------------------------------
// Extra fields stored on expense metadata (JSON) for DE rules
// ---------------------------------------------------------------------------

export const ExpenseDeductibilityMetaSchema = z.object({
  /** Participants (for client meals) */
  participants: z.string().optional(),
  /** Business occasion description */
  occasion: z.string().optional(),
  /** Gift recipient identifier */
  recipient: z.string().optional(),
  /** 0–100 business-use fraction */
  businessUsePercent: z.number().int().min(0).max(100).optional(),
  /** Travel metadata for per-diem calculation */
  travelMeta: z
    .object({
      date: z.string(),
      /** Total absence hours (8h → 14 EUR, 24h → 28 EUR) */
      absenceHours: z.number().optional(),
      country: z.string().default("DE"),
    })
    .optional(),
  /** Number of home-office days (for flat-rate rule) */
  homeOfficeDays: z.number().int().min(0).optional(),
});
export type ExpenseDeductibilityMeta = z.infer<typeof ExpenseDeductibilityMetaSchema>;
