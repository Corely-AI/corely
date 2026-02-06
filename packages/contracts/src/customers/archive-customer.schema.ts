import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";
import { PartyRoleTypeSchema } from "../crm/party.types";

export const ArchiveCustomerInputSchema = z.object({
  id: z.string(),
  role: PartyRoleTypeSchema.optional(),
});

export const ArchiveCustomerOutputSchema = z.object({
  customer: CustomerDtoSchema,
});

export type ArchiveCustomerInput = z.infer<typeof ArchiveCustomerInputSchema>;
export type ArchiveCustomerOutput = z.infer<typeof ArchiveCustomerOutputSchema>;
