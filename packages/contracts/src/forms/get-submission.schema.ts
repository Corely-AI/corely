import { z } from "zod";
import { FormSubmissionDtoSchema } from "./form.types";

export const GetFormSubmissionInputSchema = z.object({
  formId: z.string(),
  submissionId: z.string(),
});

export const GetFormSubmissionOutputSchema = z.object({
  submission: FormSubmissionDtoSchema,
});

export type GetFormSubmissionInput = z.infer<typeof GetFormSubmissionInputSchema>;
export type GetFormSubmissionOutput = z.infer<typeof GetFormSubmissionOutputSchema>;
