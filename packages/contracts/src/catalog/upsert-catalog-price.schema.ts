import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { CatalogPriceDtoSchema } from "./catalog.types";

export const UpsertCatalogPriceInputSchema = z
  .object({
    priceId: z.string().optional(),
    priceListId: z.string(),
    itemId: z.string().optional().nullable(),
    variantId: z.string().optional().nullable(),
    amount: z.number().nonnegative(),
    taxIncluded: z.boolean().default(false),
    effectiveFrom: z.string().datetime().optional().nullable(),
    effectiveTo: z.string().datetime().optional().nullable(),
    idempotencyKey: z.string().optional(),
  })
  .refine((value) => Boolean(value.itemId) || Boolean(value.variantId), {
    message: "Either itemId or variantId must be provided",
    path: ["itemId"],
  });

export const UpsertCatalogPriceOutputSchema = z.object({ price: CatalogPriceDtoSchema });

export const ListCatalogPricesInputSchema = ListQuerySchema.extend({
  priceListId: z.string().optional(),
  itemId: z.string().optional(),
  variantId: z.string().optional(),
});

export const ListCatalogPricesOutputSchema = createListResponseSchema(CatalogPriceDtoSchema);

export type UpsertCatalogPriceInput = z.infer<typeof UpsertCatalogPriceInputSchema>;
export type UpsertCatalogPriceOutput = z.infer<typeof UpsertCatalogPriceOutputSchema>;
export type ListCatalogPricesInput = z.infer<typeof ListCatalogPricesInputSchema>;
export type ListCatalogPricesOutput = z.infer<typeof ListCatalogPricesOutputSchema>;
