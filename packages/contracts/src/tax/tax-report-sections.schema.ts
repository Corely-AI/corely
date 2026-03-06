import { z } from "zod";
import { AnnualIncomeSectionPayloadSchema } from "./annual-income-report.schema";

export const TaxFilingReportTypeSchema = z.enum(["annual_income_report"]);
export type TaxFilingReportType = z.infer<typeof TaxFilingReportTypeSchema>;

export const TaxFilingReportStatusSchema = z.enum([
  "draft",
  "ready",
  "validated",
  "submitted",
  "failed",
]);
export type TaxFilingReportStatus = z.infer<typeof TaxFilingReportStatusSchema>;

export const TaxReportSectionKeySchema = z.enum(["annualIncome"]);
export type TaxReportSectionKey = z.infer<typeof TaxReportSectionKeySchema>;

export const TaxReportSectionValidationErrorSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
  code: z.string().optional(),
});
export type TaxReportSectionValidationError = z.infer<typeof TaxReportSectionValidationErrorSchema>;

export const TaxReportSectionPayloadSchema = z.object({
  annualIncome: AnnualIncomeSectionPayloadSchema,
});
export type TaxReportSectionPayload = z.infer<typeof TaxReportSectionPayloadSchema>;

export const TaxReportSectionSummarySchema = z.object({
  id: z.string(),
  sectionKey: TaxReportSectionKeySchema,
  completion: z.number().min(0).max(1),
  isComplete: z.boolean(),
  validationErrors: z.array(TaxReportSectionValidationErrorSchema).default([]),
  updatedAt: z.string().datetime(),
});
export type TaxReportSectionSummary = z.infer<typeof TaxReportSectionSummarySchema>;

export const TaxFilingReportSummarySchema = z.object({
  id: z.string(),
  type: TaxFilingReportTypeSchema,
  status: TaxFilingReportStatusSchema,
  sections: z.array(TaxReportSectionSummarySchema).default([]),
});
export type TaxFilingReportSummary = z.infer<typeof TaxFilingReportSummarySchema>;

export const TaxReportSectionSchema = z.object({
  id: z.string(),
  filingId: z.string(),
  reportId: z.string(),
  reportType: TaxFilingReportTypeSchema,
  sectionKey: TaxReportSectionKeySchema,
  completion: z.number().min(0).max(1),
  isComplete: z.boolean(),
  validationErrors: z.array(TaxReportSectionValidationErrorSchema).default([]),
  payload: z.object({
    annualIncome: AnnualIncomeSectionPayloadSchema,
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxReportSection = z.infer<typeof TaxReportSectionSchema>;

export const UpsertAnnualIncomeSectionInputSchema = z.object({
  payload: z.unknown(),
});
export type UpsertAnnualIncomeSectionInput = z.infer<typeof UpsertAnnualIncomeSectionInputSchema>;

export const GetTaxReportSectionOutputSchema = z.object({
  report: TaxFilingReportSummarySchema,
  section: TaxReportSectionSchema,
});
export type GetTaxReportSectionOutput = z.infer<typeof GetTaxReportSectionOutputSchema>;

export const UpsertTaxReportSectionOutputSchema = z.object({
  report: TaxFilingReportSummarySchema,
  section: TaxReportSectionSchema,
});
export type UpsertTaxReportSectionOutput = z.infer<typeof UpsertTaxReportSectionOutputSchema>;
