import { SignCeremonyStatusSchema } from "./ceremony.schema";
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
export const SignRequestDraftSchema = CreateSignRequestDraftSchema.extend({
  requestId: z.string().uuid(),
  title: z.string(),
  canonicalSha256: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("DRAFT"),
});
export type SignRequestDraft = z.infer<typeof SignRequestDraftSchema>;

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
