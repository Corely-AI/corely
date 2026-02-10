import { z } from "zod";
import { CreateTenantInputSchema } from "@corely/contracts";

export const tenantFormSchema = CreateTenantInputSchema.omit({ idempotencyKey: true }).extend({
  name: z.string().min(1, "Tenant name is required"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/i, "Use letters, numbers, and hyphens only"),
  notes: z.string().max(2000, "Notes must be 2000 characters or less").optional().nullable(),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;

export const getDefaultTenantFormValues = (): TenantFormValues => ({
  name: "",
  slug: "",
  status: "ACTIVE",
  notes: "",
});
