import { z } from "zod";
import { DealDtoSchema } from "./deal.types";
import { PartyDtoSchema } from "./party.types";

export const ConvertLeadInputSchema = z.object({
  leadId: z.string(),
  dealTitle: z.string().optional(), // Defaults to Lead's name + " Deal"
  assignToUserId: z.string().optional(),

  // Optional: Merge with existing Party instead of creating new
  existingPartyId: z.string().optional(),
  existingCompanyId: z.string().optional(),
});

export const ConvertLeadOutputSchema = z.object({
  deal: DealDtoSchema,
  contact: PartyDtoSchema,
  company: PartyDtoSchema.nullable(),
});

export type ConvertLeadInput = z.infer<typeof ConvertLeadInputSchema>;
export type ConvertLeadOutput = z.infer<typeof ConvertLeadOutputSchema>;
