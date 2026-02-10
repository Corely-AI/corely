import { z } from "zod";
import { CustomerDtoSchema } from "./customer.types";
import { PartyRoleTypeSchema } from "../crm/party.types";

export const SearchCustomersInputSchema = z.object({
  q: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(200).optional(),
  role: PartyRoleTypeSchema.optional(),
});

export const SearchCustomersOutputSchema = z.object({
  items: z.array(CustomerDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type SearchCustomersInput = z.infer<typeof SearchCustomersInputSchema>;
export type SearchCustomersOutput = z.infer<typeof SearchCustomersOutputSchema>;
