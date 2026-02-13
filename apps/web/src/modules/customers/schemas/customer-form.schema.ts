import { z } from "zod";
import type { CreateCustomerInput, UpdateCustomerInput, CustomerDto } from "@corely/contracts";

export const customerFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  vatId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lifecycleStatus: z.enum(["LEAD", "ACTIVE", "PAUSED", "ARCHIVED"]).default("ACTIVE"),
  billingAddress: z
    .object({
      line1: z.string().optional(),
      line2: z.string().optional(),
      city: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

export function toCreateCustomerInput(data: CustomerFormData): CreateCustomerInput {
  return {
    displayName: data.displayName,
    email: data.email || undefined,
    phone: data.phone || undefined,
    vatId: data.vatId || undefined,
    notes: data.notes || undefined,
    tags: data.tags,
    lifecycleStatus: data.lifecycleStatus,
    billingAddress:
      data.billingAddress?.line1 || data.billingAddress?.city
        ? {
            line1: data.billingAddress.line1 || "",
            line2: data.billingAddress.line2,
            city: data.billingAddress.city,
            postalCode: data.billingAddress.postalCode,
            country: data.billingAddress.country,
          }
        : undefined,
  };
}

export function toUpdateCustomerInput(data: CustomerFormData): UpdateCustomerInput["patch"] {
  return {
    displayName: data.displayName,
    email: data.email || null,
    phone: data.phone || null,
    vatId: data.vatId || null,
    notes: data.notes || null,
    tags: data.tags || null,
    lifecycleStatus: data.lifecycleStatus,
    billingAddress:
      data.billingAddress?.line1 || data.billingAddress?.city
        ? {
            line1: data.billingAddress.line1 || "",
            line2: data.billingAddress.line2,
            city: data.billingAddress.city,
            postalCode: data.billingAddress.postalCode,
            country: data.billingAddress.country,
          }
        : null,
  };
}

export function getDefaultCustomerFormValues(): CustomerFormData {
  return {
    displayName: "",
    email: "",
    phone: "",
    vatId: "",
    notes: "",
    tags: [],
    lifecycleStatus: "ACTIVE",
    billingAddress: {
      line1: "",
      line2: "",
      city: "",
      postalCode: "",
      country: "",
    },
  };
}

export function toCustomerFormValues(customer: CustomerDto): CustomerFormData {
  const defaults = getDefaultCustomerFormValues();

  return {
    ...defaults,
    displayName: customer.displayName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    vatId: customer.vatId ?? "",
    notes: customer.notes ?? "",
    tags: customer.tags ?? [],
    lifecycleStatus: customer.lifecycleStatus ?? "ACTIVE",
    billingAddress: {
      ...defaults.billingAddress,
      line1: customer.billingAddress?.line1 ?? "",
      line2: customer.billingAddress?.line2 ?? "",
      city: customer.billingAddress?.city ?? "",
      postalCode: customer.billingAddress?.postalCode ?? "",
      country: customer.billingAddress?.country ?? "",
    },
  };
}
