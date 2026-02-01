import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const UpdateFieldInputSchema = z.object({
  label: z.string().min(1).optional(),
  required: z.boolean().optional(),
  helpText: z.string().optional().nullable(),
  order: z.number().int().min(0).optional(),
  config: z.record(z.any()).optional().nullable(),
});

export const UpdateFieldOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type UpdateFieldInput = z.infer<typeof UpdateFieldInputSchema>;
export type UpdateFieldOutput = z.infer<typeof UpdateFieldOutputSchema>;
