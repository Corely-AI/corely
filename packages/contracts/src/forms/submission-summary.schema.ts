import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const FormSubmissionSummarySchema = z.object({
  count: z.number().int(),
  lastSubmittedAt: utcInstantSchema.optional().nullable(),
  keyCounts: z.record(z.number().int()),
});

export type FormSubmissionSummary = z.infer<typeof FormSubmissionSummarySchema>;
