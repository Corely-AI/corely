import { z } from "zod";
import {
  TaxElsterDeclarationTypeSchema,
  TaxElsterGatewayMessageSchema,
  TaxElsterGatewayOutcomeSchema,
} from "./eric-gateway.schema";

export const TaxEricJobActionSchema = z.enum(["validate", "submit"]);
export type TaxEricJobAction = z.infer<typeof TaxEricJobActionSchema>;

export const TaxEricReportTypeSchema = z.enum(["annual_income_report", "vat_advance_report"]);
export type TaxEricReportType = z.infer<typeof TaxEricReportTypeSchema>;

export const TaxEricJobStatusSchema = z.enum([
  "queued",
  "running",
  "validation_failed",
  "submission_failed",
  "technical_failed",
  "succeeded",
  "succeeded_with_warnings",
]);
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
  reportType: TaxEricReportTypeSchema,
  declarationType: TaxElsterDeclarationTypeSchema.nullable().optional(),
  action: TaxEricJobActionSchema,
  status: TaxEricJobStatusSchema,
  correlationId: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  payloadVersion: z.string().nullable().optional(),
  requestHash: z.string().nullable().optional(),
  certificateReferenceId: z.string().nullable().optional(),
  gatewayVersion: z.string().nullable().optional(),
  ericVersion: z.string().nullable().optional(),
  transferReference: z.string().nullable().optional(),
  outcome: TaxElsterGatewayOutcomeSchema.nullable().optional(),
  resultCodes: z.array(z.string()).default([]),
  messages: z.array(TaxElsterGatewayMessageSchema).default([]),
  requestPayload: z.record(z.string(), z.unknown()).nullable().optional(),
  responsePayload: z.record(z.string(), z.unknown()).nullable().optional(),
  technicalDetails: z.record(z.string(), z.unknown()).nullable().optional(),
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
