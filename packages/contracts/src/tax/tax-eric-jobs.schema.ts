import { z } from "zod";
import { TaxFilingReportTypeSchema } from "./tax-report-sections.schema";

export const TaxEricJobActionSchema = z.enum(["validate", "submit"]);
export type TaxEricJobAction = z.infer<typeof TaxEricJobActionSchema>;

export const TaxEricJobStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
export type TaxEricJobStatus = z.infer<typeof TaxEricJobStatusSchema>;

export const TaxEricArtifactKindSchema = z.enum(["xml", "protocol_pdf", "log"]);
export type TaxEricArtifactKind = z.infer<typeof TaxEricArtifactKindSchema>;

export const TaxEricArtifactRefSchema = z.object({
  kind: TaxEricArtifactKindSchema,
  documentId: z.string(),
  fileName: z.string().optional(),
});
export type TaxEricArtifactRef = z.infer<typeof TaxEricArtifactRefSchema>;

export const TaxEricJobSchema = z.object({
  id: z.string(),
  filingId: z.string(),
  reportId: z.string(),
  reportType: TaxFilingReportTypeSchema,
  action: TaxEricJobActionSchema,
  status: TaxEricJobStatusSchema,
  requestPayload: z.record(z.string(), z.unknown()).nullable().optional(),
  responsePayload: z.record(z.string(), z.unknown()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  artifacts: z.array(TaxEricArtifactRefSchema).default([]),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable().optional(),
  finishedAt: z.string().datetime().nullable().optional(),
  updatedAt: z.string().datetime(),
});
export type TaxEricJob = z.infer<typeof TaxEricJobSchema>;

export const CreateTaxEricJobOutputSchema = z.object({
  job: TaxEricJobSchema,
});
export type CreateTaxEricJobOutput = z.infer<typeof CreateTaxEricJobOutputSchema>;

export const GetTaxEricJobOutputSchema = z.object({
  job: TaxEricJobSchema,
});
export type GetTaxEricJobOutput = z.infer<typeof GetTaxEricJobOutputSchema>;
