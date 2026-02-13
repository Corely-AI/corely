import { z } from "zod";
import { CustomerDtoSchema, CustomerBillingAddressSchema } from "./customer.types";
import {
  PartyRoleTypeSchema,
  PartyLifecycleStatusSchema,
  PartySocialLinksSchema,
} from "../crm/party.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

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
    socialLinks: PartySocialLinksSchema.optional().nullable(),
    customFieldValues: z.record(z.string(), z.unknown()).optional().nullable(),
    dimensionAssignments: z.array(EntityDimensionAssignmentSchema).optional(),
    lifecycleStatus: PartyLifecycleStatusSchema.optional(),
  }),
});

export const UpdateCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;
export type UpdateCustomerOutput = z.infer<typeof UpdateCustomerOutputSchema>;
