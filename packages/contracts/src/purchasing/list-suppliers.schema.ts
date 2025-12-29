import { z } from "zod";
import { PartyDtoSchema } from "../crm/party.types";

export const ListSuppliersInputSchema = z.object({
  search: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListSuppliersOutputSchema = z.object({
  suppliers: z.array(PartyDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListSuppliersInput = z.infer<typeof ListSuppliersInputSchema>;
export type ListSuppliersOutput = z.infer<typeof ListSuppliersOutputSchema>;
