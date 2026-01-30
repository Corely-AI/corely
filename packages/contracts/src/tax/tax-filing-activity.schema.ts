import { z } from "zod";

export const TaxFilingActivityActorSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});
export type TaxFilingActivityActor = z.infer<typeof TaxFilingActivityActorSchema>;

const TaxFilingActivityBaseSchema = z.object({
  id: z.string(),
  type: z.string(),
  timestamp: z.string().datetime(),
  actor: TaxFilingActivityActorSchema.optional(),
});

export const TaxFilingActivityEventSchema = z.discriminatedUnion("type", [
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("created"),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("recalculated"),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("submitted"),
    submissionId: z.string().optional(),
    method: z.string().optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("paid"),
    amountCents: z.number().int().optional(),
    method: z.string().optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("deleted"),
    reason: z.string().optional(),
  }),
]);
export type TaxFilingActivityEvent = z.infer<typeof TaxFilingActivityEventSchema>;

export const TaxFilingActivityResponseSchema = z.object({
  events: z.array(TaxFilingActivityEventSchema),
});
export type TaxFilingActivityResponse = z.infer<typeof TaxFilingActivityResponseSchema>;
