import { z } from "zod";

export const EricModeSchema = z.enum(["test", "prod"]);
export type EricMode = z.infer<typeof EricModeSchema>;

export const EricMessageSeveritySchema = z.enum(["info", "warning", "error"]);
export type EricMessageSeverity = z.infer<typeof EricMessageSeveritySchema>;

export const EricOutcomeSchema = z.enum([
  "success",
  "validation_failed",
  "transport_failed",
  "runtime_error",
]);
export type EricOutcome = z.infer<typeof EricOutcomeSchema>;

export const EricRequestCredentialsSchema = z.object({
  certificatePfxOrP12BytesBase64: z.string().optional(),
  certificateDocumentRef: z.string().optional(),
  certificatePassword: z.string().optional(),
});
export type EricRequestCredentials = z.infer<typeof EricRequestCredentialsSchema>;

export const EricRequestOptionsSchema = z.object({
  generateProtocolPdf: z.boolean().default(false),
  returnXml: z.boolean().default(false),
  returnLog: z.boolean().default(false),
});
export type EricRequestOptions = z.infer<typeof EricRequestOptionsSchema>;

export const EricRequestSchema = z
  .object({
    requestId: z.string().min(1),
    filingId: z.string().optional(),
    reportId: z.string().min(1),
    reportType: z.string().min(1),
    taxYear: z.number().int().min(1900).max(3000),
    mode: EricModeSchema,
    payload: z.record(z.string(), z.unknown()).optional(),
    xml: z.string().min(1).optional(),
    credentials: EricRequestCredentialsSchema.optional(),
    options: EricRequestOptionsSchema.default({
      generateProtocolPdf: false,
      returnXml: false,
      returnLog: false,
    }),
  })
  .superRefine((value, ctx) => {
    if (!value.payload && !value.xml) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either payload or xml must be provided",
        path: ["payload"],
      });
    }
  });
export type EricRequest = z.infer<typeof EricRequestSchema>;

export const EricResultMessageSchema = z.object({
  severity: EricMessageSeveritySchema,
  code: z.string().min(1),
  text: z.string().min(1),
  path: z.string().optional(),
  ruleId: z.string().optional(),
});
export type EricResultMessage = z.infer<typeof EricResultMessageSchema>;

export const EricResultArtifactsSchema = z.object({
  xmlBase64: z.string().optional(),
  protocolPdfBase64: z.string().optional(),
  logTextBase64: z.string().optional(),
  logText: z.string().optional(),
});
export type EricResultArtifacts = z.infer<typeof EricResultArtifactsSchema>;

export const EricResultTimingsSchema = z.object({
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  durationMs: z.number().nonnegative(),
});
export type EricResultTimings = z.infer<typeof EricResultTimingsSchema>;

export const EricResultSchema = z.object({
  requestId: z.string().min(1),
  outcome: EricOutcomeSchema,
  ericVersion: z.string().optional(),
  schemaVersion: z.string().optional(),
  datenartVersion: z.string().optional(),
  messages: z.array(EricResultMessageSchema).default([]),
  artifacts: EricResultArtifactsSchema.optional(),
  timings: EricResultTimingsSchema,
  retryable: z.boolean(),
});
export type EricResult = z.infer<typeof EricResultSchema>;
