import { z } from "zod";
import { LeadStatusSchema, LeadSourceSchema, LeadDtoSchema } from "./lead.types";

export const CreateLeadInputSchema = z.object({
  source: LeadSourceSchema.default("MANUAL"),
  status: LeadStatusSchema.default("NEW"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  ownerUserId: z.string().optional(),
  notes: z.string().optional(),
});

export const CreateLeadOutputSchema = z.object({
  lead: LeadDtoSchema,
});

export type CreateLeadInput = z.infer<typeof CreateLeadInputSchema>;
export type CreateLeadOutput = z.infer<typeof CreateLeadOutputSchema>;
