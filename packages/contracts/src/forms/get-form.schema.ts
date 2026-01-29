import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const GetFormInputSchema = z.object({
  formId: z.string(),
});

export const GetFormOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type GetFormInput = z.infer<typeof GetFormInputSchema>;
export type GetFormOutput = z.infer<typeof GetFormOutputSchema>;
