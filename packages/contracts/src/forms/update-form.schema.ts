import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const UpdateFormInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
});

export const UpdateFormOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type UpdateFormInput = z.infer<typeof UpdateFormInputSchema>;
export type UpdateFormOutput = z.infer<typeof UpdateFormOutputSchema>;
