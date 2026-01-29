import { z } from "zod";
import { FormSubmissionDtoSchema } from "./form.types";

export const PublicSubmitInputSchema = z.object({
  token: z.string().min(1),
  payload: z.record(z.any()),
});

export const PublicSubmitOutputSchema = z.object({
  submission: FormSubmissionDtoSchema,
});

export type PublicSubmitInput = z.infer<typeof PublicSubmitInputSchema>;
export type PublicSubmitOutput = z.infer<typeof PublicSubmitOutputSchema>;
