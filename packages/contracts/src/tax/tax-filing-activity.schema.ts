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
  notes: z.string().optional(),
});

export const TaxFilingActivityEventSchema = z.discriminatedUnion("type", [
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("created"),
    payload: z.record(z.unknown()).optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("recalculated"),
    payload: z
      .object({
        lastRecalculatedAt: z.string().datetime().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("submitted"),
    payload: z
      .object({
        submissionId: z.string().optional(),
        method: z.string().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("paid"),
    payload: z
      .object({
        amountCents: z.number().int().optional(),
        method: z.string().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("attachmentAdded"),
    payload: z
      .object({
        documentId: z.string().optional(),
        title: z.string().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("issuesDetected"),
    payload: z
      .object({
        count: z.number().int().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("issuesResolved"),
    payload: z
      .object({
        count: z.number().int().optional(),
      })
      .optional(),
  }),
  TaxFilingActivityBaseSchema.extend({
    type: z.literal("deleted"),
    payload: z
      .object({
        reason: z.string().optional(),
      })
      .optional(),
  }),
]);
export type TaxFilingActivityEvent = z.infer<typeof TaxFilingActivityEventSchema>;

export const TaxFilingActivityResponseSchema = z.object({
  events: z.array(TaxFilingActivityEventSchema),
});
export type TaxFilingActivityResponse = z.infer<typeof TaxFilingActivityResponseSchema>;
