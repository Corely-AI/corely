import { z } from "zod";
import { CustomerDtoSchema, CustomerBillingAddressSchema } from "./customer.types";
import { localDateSchema } from "../shared/local-date.schema";
import {
  PartyRoleTypeSchema,
  PartyLifecycleStatusSchema,
  PartySocialLinksSchema,
  PartyKindSchema,
} from "../crm/party.types";
import { EntityDimensionAssignmentSchema } from "../common/customization/custom-attributes";

export const UpdateCustomerInputSchema = z.object({
  id: z.string(),
  role: PartyRoleTypeSchema.optional(),
  patch: z.object({
    kind: PartyKindSchema.optional(),
    displayName: z.string().min(1).optional(),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),
    organizationName: z.string().optional().nullable(),
    jobTitle: z.string().nullable().optional(),
    department: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    birthday: localDateSchema.optional().nullable(),
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
