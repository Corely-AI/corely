import { z } from "zod";
import { AnnualIncomeSectionPayloadSchema } from "./annual-income-report.schema";
import {
  AdditionalExpensesSectionPayloadSchema,
  ChildrenSectionPayloadSchema,
  HealthInsuranceSectionPayloadSchema,
  IncomeSectionPayloadSchema,
  OtherInsurancesSectionPayloadSchema,
  PayslipsSectionPayloadSchema,
  PersonalDetailsSectionPayloadSchema,
  TaxOfficeInfoSectionPayloadSchema,
  type TaxReportSectionValueByKey,
} from "./income-tax-return-sections.schema";

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

export const TaxReportSectionKeySchema = z.enum([
  "annualIncome",
  "personalDetails",
  "income",
  "healthInsurance",
  "otherInsurances",
  "additionalExpenses",
  "taxOfficeInfo",
  "payslips",
  "children",
]);
export type TaxReportSectionKey = z.infer<typeof TaxReportSectionKeySchema>;

export const TaxReportSectionValidationErrorSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
  code: z.string().optional(),
});
export type TaxReportSectionValidationError = z.infer<typeof TaxReportSectionValidationErrorSchema>;

export const TaxReportSectionPayloadSchema = z.union([
  z.object({ annualIncome: AnnualIncomeSectionPayloadSchema }),
  z.object({ personalDetails: PersonalDetailsSectionPayloadSchema }),
  z.object({ income: IncomeSectionPayloadSchema }),
  z.object({ healthInsurance: HealthInsuranceSectionPayloadSchema }),
  z.object({ otherInsurances: OtherInsurancesSectionPayloadSchema }),
  z.object({ additionalExpenses: AdditionalExpensesSectionPayloadSchema }),
  z.object({ taxOfficeInfo: TaxOfficeInfoSectionPayloadSchema }),
  z.object({ payslips: PayslipsSectionPayloadSchema }),
  z.object({ children: ChildrenSectionPayloadSchema }),
]);
export type TaxReportSectionPayload = z.infer<typeof TaxReportSectionPayloadSchema>;
export type { TaxReportSectionValueByKey };

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
  payload: TaxReportSectionPayloadSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type TaxReportSection = z.infer<typeof TaxReportSectionSchema>;

export const UpsertTaxReportSectionInputSchema = z.object({
  payload: z.unknown(),
});
export type UpsertTaxReportSectionInput = z.infer<typeof UpsertTaxReportSectionInputSchema>;
export const UpsertAnnualIncomeSectionInputSchema = UpsertTaxReportSectionInputSchema;
export type UpsertAnnualIncomeSectionInput = UpsertTaxReportSectionInput;

export const GetTaxReportSectionOutputSchema = z.object({
  report: TaxFilingReportSummarySchema,
  section: TaxReportSectionSchema,
});
export type GetTaxReportSectionOutput = z.infer<typeof GetTaxReportSectionOutputSchema>;

export const ListTaxReportSectionsOutputSchema = z.object({
  report: TaxFilingReportSummarySchema,
  sections: z.array(TaxReportSectionSchema).default([]),
});
export type ListTaxReportSectionsOutput = z.infer<typeof ListTaxReportSectionsOutputSchema>;

export const UpsertTaxReportSectionOutputSchema = z.object({
  report: TaxFilingReportSummarySchema,
  section: TaxReportSectionSchema,
});
export type UpsertTaxReportSectionOutput = z.infer<typeof UpsertTaxReportSectionOutputSchema>;
