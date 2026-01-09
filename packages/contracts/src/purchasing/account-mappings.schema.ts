import { z } from "zod";
import { PurchasingAccountMappingSchema } from "./settings.types";

export const ListAccountMappingsInputSchema = z.object({
  supplierPartyId: z.string().optional(),
});

export const ListAccountMappingsOutputSchema = z.object({
  mappings: z.array(PurchasingAccountMappingSchema),
});

export const UpsertAccountMappingInputSchema = z.object({
  supplierPartyId: z.string(),
  categoryKey: z.string(),
  glAccountId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const UpsertAccountMappingOutputSchema = z.object({
  mapping: PurchasingAccountMappingSchema,
});

export type ListAccountMappingsInput = z.infer<typeof ListAccountMappingsInputSchema>;
export type ListAccountMappingsOutput = z.infer<typeof ListAccountMappingsOutputSchema>;
export type UpsertAccountMappingInput = z.infer<typeof UpsertAccountMappingInputSchema>;
export type UpsertAccountMappingOutput = z.infer<typeof UpsertAccountMappingOutputSchema>;
