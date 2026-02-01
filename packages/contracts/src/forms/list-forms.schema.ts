import { z } from "zod";
import { ListQuerySchema, PageInfoSchema } from "../common/list.contract";
import { FormDefinitionDtoSchema, FormStatusSchema } from "./form.types";

export const ListFormsInputSchema = ListQuerySchema.extend({
  status: FormStatusSchema.optional(),
  includeArchived: z.boolean().optional(),
  cursor: z.string().optional(),
});

export const ListFormsOutputSchema = z.object({
  items: z.array(FormDefinitionDtoSchema),
  pageInfo: PageInfoSchema,
  nextCursor: z.string().nullable().optional(),
});

export type ListFormsInput = z.infer<typeof ListFormsInputSchema>;
export type ListFormsOutput = z.infer<typeof ListFormsOutputSchema>;
