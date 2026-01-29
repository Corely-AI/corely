import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const ReorderFieldsInputSchema = z.object({
  fieldIds: z.array(z.string()).min(1),
});

export const ReorderFieldsOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type ReorderFieldsInput = z.infer<typeof ReorderFieldsInputSchema>;
export type ReorderFieldsOutput = z.infer<typeof ReorderFieldsOutputSchema>;
