import { z } from "zod";
import type { UpsertTaxConsultantInput } from "@corely/contracts";

export const taxConsultantFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type TaxConsultantFormData = z.infer<typeof taxConsultantFormSchema>;

export const toUpsertTaxConsultantInput = (
  form: TaxConsultantFormData
): UpsertTaxConsultantInput => ({
  name: form.name,
  email: form.email ?? null,
  phone: form.phone ?? null,
  notes: form.notes ?? null,
});
