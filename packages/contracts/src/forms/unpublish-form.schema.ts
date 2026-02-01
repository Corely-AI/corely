import { z } from "zod";
import { FormDefinitionDtoSchema } from "./form.types";

export const UnpublishFormOutputSchema = z.object({
  form: FormDefinitionDtoSchema,
});

export type UnpublishFormOutput = z.infer<typeof UnpublishFormOutputSchema>;
