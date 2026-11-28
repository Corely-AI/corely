import { SignCeremonyStatusSchema } from "./ceremony.schema";
import { SignFieldSchema, SignLayoutSchema } from "./layout.schema";
import { z } from "zod";
import { SignTemplateIdSchema } from "./template.schema";
export const SignRecipientInputSchema = z
  .object({
    roleId: z.string().min(1).max(80),
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(254),
  })
  .strict();
export const CreateSignRequestDraftSchema = z
  .object({
    templateId: SignTemplateIdSchema,
    templateRevision: z.number().int().positive(),
    routing: z.enum(["parallel", "sequential"]),
    recipients: z.array(SignRecipientInputSchema).min(1).max(20),
  })
  .strict();
export type CreateSignRequestDraft = z.infer<typeof CreateSignRequestDraftSchema>;

export const SignDraftSettingsSchema = z
  .object({
    expiresAt: z.string().datetime().nullable(),
    consent: z.string().trim().max(2000),
    invitation: z.string().trim().max(2000),
  })
  .strict();
export type SignDraftSettings = z.infer<typeof SignDraftSettingsSchema>;

export const SignRequestDraftConfigurationSchema = z
  .object({
    revision: z.number().int().min(1).max(2147483646),
    layout: SignLayoutSchema,
    settings: SignDraftSettingsSchema,
  })
  .strict();
export type SignRequestDraftConfiguration = z.infer<typeof SignRequestDraftConfigurationSchema>;

export const UpdateSignRequestDraftSchema = CreateSignRequestDraftSchema.pick({
  routing: true,
  recipients: true,
})
  .extend({
    expectedRevision: z.number().int().min(0).max(2147483645),
    layout: SignLayoutSchema,
    settings: SignDraftSettingsSchema,
  })
  .strict();
export type UpdateSignRequestDraft = z.infer<typeof UpdateSignRequestDraftSchema>;

export const SignRequestDraftSchema = CreateSignRequestDraftSchema.extend({
  requestId: z.string().uuid(),
  title: z.string(),
  canonicalSha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("DRAFT"),
  configuration: SignRequestDraftConfigurationSchema.optional(),
  replacesRequestId: z.string().uuid().optional(),
  workflowManaged: z.literal(true).optional(),
});
export type SignRequestDraft = z.infer<typeof SignRequestDraftSchema>;

export const SignRequestSourceSchema = z.object({
  base64: z.string().min(8).max(13981016),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  fields: z.array(SignFieldSchema).max(250).optional(),
  layout: SignLayoutSchema.optional(),
  draftRevision: z.number().int().nonnegative().optional(),
});

export const SignRequestSummarySchema = SignRequestDraftSchema.pick({
  requestId: true,
  templateRevision: true,
  title: true,
  status: true,
}).extend({ status: SignCeremonyStatusSchema });
export const SignRequestFilterSchema = z
  .object({ status: SignCeremonyStatusSchema.optional(), q: z.string().trim().max(80).optional() })
  .strict();
export type SignRequestFilter = z.infer<typeof SignRequestFilterSchema>;
export type SignRequestSummary = z.infer<typeof SignRequestSummarySchema>;
export const SignRequestListSchema = z.object({
  items: z.array(SignRequestSummarySchema).max(25),
  nextCursor: z.string().uuid().nullable(),
});
