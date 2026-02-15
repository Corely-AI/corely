import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const LeadStatusSchema = z.enum(["NEW", "QUALIFIED", "DISQUALIFIED", "CONVERTED"]);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

export const LeadSourceSchema = z.enum(["WEB_FORM", "MANUAL", "IMPORT", "REFERRAL", "OTHER"]);
export type LeadSource = z.infer<typeof LeadSourceSchema>;

export const LeadDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  source: LeadSourceSchema,
  status: LeadStatusSchema,
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  companyName: z.string().nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  ownerUserId: z.string().nullable(),
  convertedDealId: z.string().nullable(),
  convertedPartyId: z.string().nullable(), // The primary contact created
  notes: z.string().nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});

export type LeadDto = z.infer<typeof LeadDtoSchema>;
export type LeadDTO = LeadDto;
