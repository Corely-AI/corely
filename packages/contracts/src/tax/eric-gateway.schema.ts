import { z } from "zod";

export const TaxElsterGatewayOperationSchema = z.enum(["validate", "submit"]);
export type TaxElsterGatewayOperation = z.infer<typeof TaxElsterGatewayOperationSchema>;

export const TaxElsterGatewayConnectionStatusSchema = z.enum(["connected", "notConfigured"]);
export type TaxElsterGatewayConnectionStatus = z.infer<
  typeof TaxElsterGatewayConnectionStatusSchema
>;

export const TaxElsterDeclarationTypeSchema = z.enum(["de-ustva"]);
export type TaxElsterDeclarationType = z.infer<typeof TaxElsterDeclarationTypeSchema>;

export const TaxElsterGatewayStatusSchema = z.enum(["completed", "rejected", "failed"]);
export type TaxElsterGatewayStatus = z.infer<typeof TaxElsterGatewayStatusSchema>;

export const TaxElsterGatewayOutcomeSchema = z.enum([
  "success",
  "success_with_warnings",
  "validation_failed",
  "submission_failed",
  "technical_failed",
]);
export type TaxElsterGatewayOutcome = z.infer<typeof TaxElsterGatewayOutcomeSchema>;

export const TaxElsterMessageSeveritySchema = z.enum(["info", "warning", "error"]);
export type TaxElsterMessageSeverity = z.infer<typeof TaxElsterMessageSeveritySchema>;

export const TaxElsterArtifactKindSchema = z.enum(["xml", "protocol_pdf", "log"]);
export type TaxElsterArtifactKind = z.infer<typeof TaxElsterArtifactKindSchema>;

export const TaxElsterGatewayMessageSchema = z.object({
  severity: TaxElsterMessageSeveritySchema,
  code: z.string().min(1),
  text: z.string().min(1),
  path: z.string().optional(),
  ruleId: z.string().optional(),
});
export type TaxElsterGatewayMessage = z.infer<typeof TaxElsterGatewayMessageSchema>;

export const TaxElsterGatewayArtifactSchema = z.object({
  kind: TaxElsterArtifactKindSchema,
  fileName: z.string().optional(),
  contentType: z.string().min(1),
  encoding: z.string().optional(),
  contentBase64: z.string().optional(),
  textContent: z.string().optional(),
});
export type TaxElsterGatewayArtifact = z.infer<typeof TaxElsterGatewayArtifactSchema>;

export const TaxElsterGatewayMetadataSchema = z.object({
  source: z.literal("corely-tax"),
  actorUserId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
  requestedAt: z.string().datetime(),
  raw: z.record(z.string(), z.unknown()).default({}),
});
export type TaxElsterGatewayMetadata = z.infer<typeof TaxElsterGatewayMetadataSchema>;

export const TaxElsterPeriodSchema = z.object({
  taxYear: z.number().int().min(2000).max(2100),
  filingPeriodKey: z.string().min(1),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
});
export type TaxElsterPeriod = z.infer<typeof TaxElsterPeriodSchema>;

export const TaxElsterKennzifferRowSchema = z.object({
  kennziffer: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
});
export type TaxElsterKennzifferRow = z.infer<typeof TaxElsterKennzifferRowSchema>;

export const TaxElsterDeUstvaPayloadSchema = z.object({
  declarationType: z.literal("de-ustva"),
  payloadVersion: z.string().min(1),
  jurisdiction: z.literal("DE"),
  filingType: z.literal("vat"),
  currency: z.string().min(3).max(3),
  periodLabel: z.string().min(1),
  totals: z.object({
    vatCollectedCents: z.number().int(),
    vatPaidCents: z.number().int(),
    netPayableCents: z.number().int(),
    salesNetCents: z.number().int(),
    purchaseNetCents: z.number().int(),
  }),
  kennzifferRows: z.array(TaxElsterKennzifferRowSchema).default([]),
});
export type TaxElsterDeUstvaPayload = z.infer<typeof TaxElsterDeUstvaPayloadSchema>;

export const TaxElsterGatewayPayloadSchema = z.discriminatedUnion("declarationType", [
  TaxElsterDeUstvaPayloadSchema,
]);
export type TaxElsterGatewayPayload = z.infer<typeof TaxElsterGatewayPayloadSchema>;

export const TaxElsterGatewayRequestSchema = z.object({
  requestId: z.string().min(1),
  jobId: z.string().min(1),
  correlationId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  filingId: z.string().min(1),
  reportId: z.string().min(1),
  reportType: z.string().min(1),
  declarationType: TaxElsterDeclarationTypeSchema,
  operation: TaxElsterGatewayOperationSchema,
  payloadVersion: z.string().min(1),
  certificateReferenceId: z.string().min(1).optional(),
  period: TaxElsterPeriodSchema,
  payload: TaxElsterGatewayPayloadSchema,
  metadata: TaxElsterGatewayMetadataSchema,
});
export type TaxElsterGatewayRequest = z.infer<typeof TaxElsterGatewayRequestSchema>;

export const TaxElsterGatewayResultSchema = z.object({
  requestId: z.string().min(1),
  jobId: z.string().min(1),
  correlationId: z.string().min(1),
  declarationType: TaxElsterDeclarationTypeSchema,
  operation: TaxElsterGatewayOperationSchema,
  gatewayStatus: TaxElsterGatewayStatusSchema,
  outcome: TaxElsterGatewayOutcomeSchema,
  retryable: z.boolean(),
  gatewayVersion: z.string().optional(),
  ericVersion: z.string().optional(),
  transferReference: z.string().optional(),
  resultCodes: z.array(z.string().min(1)).default([]),
  messages: z.array(TaxElsterGatewayMessageSchema).default([]),
  artifacts: z.array(TaxElsterGatewayArtifactSchema).default([]),
  rawMetadata: z.record(z.string(), z.unknown()).default({}),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
});
export type TaxElsterGatewayResult = z.infer<typeof TaxElsterGatewayResultSchema>;
