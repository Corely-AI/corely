import { SignFieldSchema } from "./layout.schema";
import { z } from "zod";

export const SendSignRequestSchema = z
  .object({
    confirm: z.literal(true),
    expiresAt: z.string().datetime(),
    consent: z.string().trim().min(1).max(2000),
    invitation: z.string().trim().max(2000),
    canonicalSha256: z.string().regex(/^[a-f0-9]{64}$/),
    draftRevision: z.number().int().nonnegative().optional(),
    confirmReplacement: z.literal(true).optional(),
  })
  .strict();

const point = z.array(z.number().finite().min(0).max(1)).length(2);
export const DrawnSignatureSchema = z
  .object({ strokes: z.array(z.array(point).min(2).max(128)).min(1).max(16) })
  .strict();
export type DrawnSignature = z.infer<typeof DrawnSignatureSchema>;
export const SignValuesSchema = z
  .array(
    z
      .object({
        fieldId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
        value: z.union([z.string().max(240), z.boolean(), DrawnSignatureSchema]),
      })
      .strict()
  )
  .max(250);
export type SignValues = z.infer<typeof SignValuesSchema>;
export const ReviewSignValuesSchema = z
  .object({
    consent: z.literal(true),
    review: z.string().regex(/^[a-f0-9]{64}$/),
    values: SignValuesSchema,
  })
  .strict();
export const SubmitSignValuesSchema = ReviewSignValuesSchema.extend({
  confirmation: z.string().regex(/^[a-f0-9]{64}$/),
});
export const SignCeremonyStatusSchema = z.enum([
  "DRAFT",
  "SENT",
  "VOID",
  "DECLINED",
  "EXPIRED",
  "COLLECTED",
  "COMPLETED",
]);
export const SignCeremonyViewSchema = z.object({
  sentAt: z.string().datetime().nullish(),
  verifiedAt: z.string().datetime().nullish(),
  finalizationFailed: z.boolean().default(false),
  status: SignCeremonyStatusSchema,
  expiresAt: z.string().nullable(),
  recipients: z.array(
    z.object({
      roleId: z.string(),
      status: z.enum(["WAITING", "INVITED", "ACCEPTED"]),
      deliveredAt: z.string().nullable(),
      acceptedAt: z.string().nullable(),
    })
  ),
});

export const SignOverviewSchema = z.array(
  z.object({ status: SignCeremonyStatusSchema, total: z.number().int().nonnegative() })
);
export const SignRuntimeSettingsSchema = z.object({
  publicOrigin: z.string().nullable(),
  invitationKeyConfigured: z.boolean(),
  certificateExpiresAt: z.string().nullable(),
  signerPinned: z.boolean(),
  privateKeyReadable: z.boolean(),
  trustFileReadable: z.boolean(),
});
export const SignRecipientReviewSchema = z.object({
  senderWorkspace: z.string().nullable().optional(),
  saved: SignValuesSchema,
  title: z.string(),
  role: z.string(),
  fields: z.array(SignFieldSchema),
  consent: z.string(),
  review: z.string().regex(/^[a-f0-9]{64}$/),
  pdf: z.string().min(1),
});
