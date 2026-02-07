import { z } from "zod";
import { CatalogPriceListDtoSchema, CatalogPriceListStatusSchema } from "./catalog.types";

export const UpsertCatalogPriceListInputSchema = z.object({
  priceListId: z.string().optional(),
  name: z.string().min(1),
  currency: z.string().length(3),
  status: CatalogPriceListStatusSchema.optional(),
  idempotencyKey: z.string().optional(),
});

export const UpsertCatalogPriceListOutputSchema = z.object({
  priceList: CatalogPriceListDtoSchema,
});

export type UpsertCatalogPriceListInput = z.infer<typeof UpsertCatalogPriceListInputSchema>;
export type UpsertCatalogPriceListOutput = z.infer<typeof UpsertCatalogPriceListOutputSchema>;
