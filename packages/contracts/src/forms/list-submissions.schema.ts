import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import { FormSubmissionDtoSchema, FormSubmissionSourceSchema } from "./form.types";

export const ListFormSubmissionsInputSchema = ListQuerySchema.extend({
  source: FormSubmissionSourceSchema.optional(),
  cursor: z.string().optional(),
});

export const ListFormSubmissionsOutputSchema = z.object({
  items: z.array(FormSubmissionDtoSchema),
  pageInfo: PageInfoSchema,
  nextCursor: z.string().nullable().optional(),
});

export type ListFormSubmissionsInput = z.infer<typeof ListFormSubmissionsInputSchema>;
export type ListFormSubmissionsOutput = z.infer<typeof ListFormSubmissionsOutputSchema>;
