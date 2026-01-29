import { z } from "zod";
import { PublicFormDtoSchema } from "./form.types";

export const GetPublicFormInputSchema = z.object({
  publicId: z.string().min(1),
});

export const GetPublicFormOutputSchema = z.object({
  form: PublicFormDtoSchema,
});

export type GetPublicFormInput = z.infer<typeof GetPublicFormInputSchema>;
export type GetPublicFormOutput = z.infer<typeof GetPublicFormOutputSchema>;
