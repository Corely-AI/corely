import { z } from "zod";
import { TaxFilingStatusSchema, TaxFilingTypeSchema } from "./tax-filing.types";

export const TaxIssueSeveritySchema = z.enum(["blocker", "warning", "info"]);
export type TaxIssueSeverity = z.infer<typeof TaxIssueSeveritySchema>;

export const TaxIssueTypeSchema = z.enum([
  "uncategorized-expenses",
  "missing-tax-mapping",
  "unmatched-transactions",
  "missing-invoice-link",
  "other",
]);
export type TaxIssueType = z.infer<typeof TaxIssueTypeSchema>;

export const TaxIssueSchema = z.object({
  id: z.string(),
  type: TaxIssueTypeSchema,
  severity: TaxIssueSeveritySchema,
  title: z.string(),
  count: z.number().int().optional(),
  description: z.string().optional(),
  deepLink: z.string().optional(),
});
export type TaxIssue = z.infer<typeof TaxIssueSchema>;

export const IncomeTaxTotalsSchema = z.object({
  grossIncomeCents: z.number().int().nullable(),
  deductibleExpensesCents: z.number().int().nullable(),
  netProfitCents: z.number().int().nullable(),
  estimatedTaxDueCents: z.number().int().nullable(),
  currency: z.string().optional(),
  lastRecalculatedAt: z.string().datetime().optional().nullable(),
});
export type IncomeTaxTotals = z.infer<typeof IncomeTaxTotalsSchema>;

export const TaxFilingSubmissionSchema = z.object({
  method: z.string(),
  submissionId: z.string(),
  submittedAt: z.string().datetime(),
  notes: z.string().optional(),
});
export type TaxFilingSubmission = z.infer<typeof TaxFilingSubmissionSchema>;

export const TaxFilingPaymentSchema = z.object({
  paidAt: z.string().datetime(),
  method: z.string(),
  amountCents: z.number().int(),
  proofDocumentId: z.string().optional(),
});
export type TaxFilingPayment = z.infer<typeof TaxFilingPaymentSchema>;

export const TaxFilingCapabilitiesSchema = z.object({
  canDelete: z.boolean(),
  canRecalculate: z.boolean(),
  canSubmit: z.boolean(),
  canMarkPaid: z.boolean(),
  paymentsEnabled: z.boolean(),
});
export type TaxFilingCapabilities = z.infer<typeof TaxFilingCapabilitiesSchema>;

export const TaxFilingDetailSchema = z.object({
  id: z.string(),
  type: TaxFilingTypeSchema,
  status: TaxFilingStatusSchema,
  periodLabel: z.string(),
  year: z.number().int().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  totals: IncomeTaxTotalsSchema.optional(),
  issues: z.array(TaxIssueSchema),
  submission: TaxFilingSubmissionSchema.optional(),
  payment: TaxFilingPaymentSchema.optional(),
  capabilities: TaxFilingCapabilitiesSchema,
});
export type TaxFilingDetail = z.infer<typeof TaxFilingDetailSchema>;

export const TaxFilingDetailResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type TaxFilingDetailResponse = z.infer<typeof TaxFilingDetailResponseSchema>;
