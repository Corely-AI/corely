import { z } from "zod";
import { CustomerDtoSchema, CustomerBillingAddressSchema } from "./customer.types";
import {
  PartyRoleTypeSchema,
  PartyLifecycleStatusSchema,
  PartySocialLinksSchema,
  PartyKindSchema,
} from "../crm/party.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

export const CreateCustomerInputSchema = z.object({
  kind: PartyKindSchema.default("INDIVIDUAL").optional(),
  displayName: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  organizationName: z.string().optional(),
  jobTitle: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
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
