import { z } from "zod";
import { CustomerDtoSchema, CustomerBillingAddressSchema } from "./customer.types";
import {
  PartyRoleTypeSchema,
  PartyLifecycleStatusSchema,
  PartySocialLinksSchema,
} from "../crm/party.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

export const CreateCustomerInputSchema = z.object({
  displayName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  billingAddress: CustomerBillingAddressSchema.optional(),
  vatId: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  socialLinks: PartySocialLinksSchema.optional(),
  customFieldValues: z.record(z.string(), z.unknown()).optional(),
  dimensionAssignments: z.array(EntityDimensionAssignmentSchema).optional(),
  role: PartyRoleTypeSchema.optional(),
  lifecycleStatus: PartyLifecycleStatusSchema.optional(),
});

export const CreateCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;
export type CreateCustomerOutput = z.infer<typeof CreateCustomerOutputSchema>;
