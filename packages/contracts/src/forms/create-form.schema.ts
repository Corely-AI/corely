import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const CreateFormInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
});

export const CreateFormOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type CreateFormInput = z.infer<typeof CreateFormInputSchema>;
export type CreateFormOutput = z.infer<typeof CreateFormOutputSchema>;
