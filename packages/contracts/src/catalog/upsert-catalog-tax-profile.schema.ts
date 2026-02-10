import { z } from "zod";
import { CatalogTaxExciseTypeSchema, CatalogTaxProfileDtoSchema } from "./catalog.types";

export const UpsertCatalogTaxProfileInputSchema = z.object({
  taxProfileId: z.string().optional(),
  name: z.string().min(1),
  vatRateBps: z.number().int().nonnegative(),
  isExciseApplicable: z.boolean().default(false),
  exciseType: CatalogTaxExciseTypeSchema.optional().nullable(),
  exciseValue: z.number().nonnegative().optional().nullable(),
  effectiveFrom: z.string().datetime().optional().nullable(),
  effectiveTo: z.string().datetime().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpsertCatalogTaxProfileOutputSchema = z.object({
  taxProfile: CatalogTaxProfileDtoSchema,
});

export type UpsertCatalogTaxProfileInput = z.infer<typeof UpsertCatalogTaxProfileInputSchema>;
export type UpsertCatalogTaxProfileOutput = z.infer<typeof UpsertCatalogTaxProfileOutputSchema>;
