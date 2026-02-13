import { z } from "zod";
import { CustomerDtoSchema, CustomerBillingAddressSchema } from "./customer.types";
import { PartyRoleTypeSchema, PartyLifecycleStatusSchema } from "../crm/party.types";

export const UpdateCustomerInputSchema = z.object({
  id: z.string(),
  role: PartyRoleTypeSchema.optional(),
  patch: z.object({
    displayName: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    billingAddress: CustomerBillingAddressSchema.nullable().optional(),
    vatId: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().nullable(),
    lifecycleStatus: PartyLifecycleStatusSchema.optional(),
  }),
});

export const UpdateCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;
export type UpdateCustomerOutput = z.infer<typeof UpdateCustomerOutputSchema>;
