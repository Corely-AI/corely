import { type z } from "zod";
import { CreateFormInputSchema } from "@corely/contracts";

export const formCreateSchema = CreateFormInputSchema;
export type FormCreateValues = z.infer<typeof formCreateSchema>;

export const getDefaultFormValues = (): FormCreateValues => ({
  name: "",
  description: "",
});
