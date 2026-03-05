import { z } from "zod";
import { TaxFilingStatusSchema, TaxFilingTypeSchema } from "./tax-filing.types";
import { TaxFilingExportsSchema } from "./tax-filing-export.schema";
import { TaxFilingReportSummarySchema } from "./tax-report-sections.schema";

export const TaxIssueSeveritySchema = z.enum(["blocker", "warning", "info"]);
export type TaxIssueSeverity = z.infer<typeof TaxIssueSeveritySchema>;

export const TaxIssueTypeSchema = z.enum([
  "uncategorized-expenses",
  "missing-tax-mapping",
  "missing-vat-treatment",
  "unmatched-transactions",
  "missing-invoice-link",
  "suspicious-negative-vat",
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

export const TaxSubmissionMethodSchema = z.enum(["manual", "elster", "api"]);
export type TaxSubmissionMethod = z.infer<typeof TaxSubmissionMethodSchema>;

export const TaxPaymentMethodSchema = z.enum(["bank-transfer", "direct-debit", "other", "manual"]);
export type TaxPaymentMethod = z.infer<typeof TaxPaymentMethodSchema>;

export const TaxFilingTotalsSchema = z.object({
  vatCollectedCents: z.number().int().nullable(),
  vatPaidCents: z.number().int().nullable(),
  netPayableCents: z.number().int().nullable(),
  currency: z.string().optional(),
  lastRecalculatedAt: z.string().datetime().optional().nullable(),
  salesCount: z.number().int().optional(),
  purchaseCount: z.number().int().optional(),
  salesNetCents: z.number().int().nullable().optional(),
  purchaseNetCents: z.number().int().nullable().optional(),
  // Legacy totals kept for compatibility with income filings.
  grossIncomeCents: z.number().int().nullable().optional(),
  deductibleExpensesCents: z.number().int().nullable().optional(),
  netProfitCents: z.number().int().nullable().optional(),
  estimatedTaxDueCents: z.number().int().nullable().optional(),
});
export type TaxFilingTotals = z.infer<typeof TaxFilingTotalsSchema>;
export type IncomeTaxTotals = TaxFilingTotals;

export const TaxFilingSubmissionSchema = z.object({
  method: TaxSubmissionMethodSchema,
  submissionId: z.string(),
  submittedAt: z.string().datetime(),
  notes: z.string().optional(),
});
export type TaxFilingSubmission = z.infer<typeof TaxFilingSubmissionSchema>;

export const TaxFilingPaymentSchema = z.object({
  paidAt: z.string().datetime(),
  method: TaxPaymentMethodSchema,
  amountCents: z.number().int(),
  proofDocumentId: z.string().optional(),
});
export type TaxFilingPayment = z.infer<typeof TaxFilingPaymentSchema>;

export const TaxFilingPaymentInstructionsSchema = z.object({
  bankName: z.string().optional(),
  ibanMasked: z.string().optional(),
  bic: z.string().optional(),
  reference: z.string().optional(),
});
export type TaxFilingPaymentInstructions = z.infer<typeof TaxFilingPaymentInstructionsSchema>;

export const TaxSubmissionConnectionStatusSchema = z.enum(["connected", "notConfigured"]);
export type TaxSubmissionConnectionStatus = z.infer<typeof TaxSubmissionConnectionStatusSchema>;

export const TaxFilingCapabilitiesSchema = z.object({
  canDelete: z.boolean(),
  canRecalculate: z.boolean(),
  canSubmit: z.boolean(),
  canMarkPaid: z.boolean(),
  paymentsEnabled: z.boolean(),
  submissionMethods: z.array(TaxSubmissionMethodSchema).default(["manual"]),
  submissionConnectionStatus: TaxSubmissionConnectionStatusSchema.default("notConfigured"),
});
export type TaxFilingCapabilities = z.infer<typeof TaxFilingCapabilitiesSchema>;

export const TaxFilingDetailSchema = z.object({
  id: z.string(),
  type: TaxFilingTypeSchema,
  status: TaxFilingStatusSchema,
  periodLabel: z.string(),
  periodKey: z.string().optional(),
  year: z.number().int().optional(),
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  dueDate: z.string().datetime(),
  totals: TaxFilingTotalsSchema.optional(),
  issues: z.array(TaxIssueSchema),
  submission: TaxFilingSubmissionSchema.optional(),
  payment: TaxFilingPaymentSchema.optional(),
  paymentInstructions: TaxFilingPaymentInstructionsSchema.optional(),
  exports: TaxFilingExportsSchema.optional(),
  reports: z.array(TaxFilingReportSummarySchema).optional(),
  capabilities: TaxFilingCapabilitiesSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxFilingDetail = z.infer<typeof TaxFilingDetailSchema>;

export const TaxFilingDetailResponseSchema = z.object({
  filing: TaxFilingDetailSchema,
});
export type TaxFilingDetailResponse = z.infer<typeof TaxFilingDetailResponseSchema>;
