import { z } from "zod";
import { FormDefinitionDtoSchema, FormFieldTypeSchema } from "./form.types";

export const AddFieldInputSchema = z.object({
  key: z.string().min(1).optional(),
  label: z.string().min(1),
  type: FormFieldTypeSchema,
  required: z.boolean().optional(),
  helpText: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  config: z.record(z.any()).optional().nullable(),
});

export const AddFieldOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type AddFieldInput = z.infer<typeof AddFieldInputSchema>;
export type AddFieldOutput = z.infer<typeof AddFieldOutputSchema>;
