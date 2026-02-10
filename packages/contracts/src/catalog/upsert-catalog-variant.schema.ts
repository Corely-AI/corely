import { z } from "zod";
import { CatalogVariantDtoSchema, CatalogVariantStatusSchema } from "./catalog.types";

export const UpsertCatalogVariantInputSchema = z.object({
  variantId: z.string().optional(),
  itemId: z.string(),
  sku: z.string().min(1),
  name: z.string().optional().nullable(),
  status: CatalogVariantStatusSchema.optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  barcodes: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
});

export const UpsertCatalogVariantOutputSchema = z.object({ variant: CatalogVariantDtoSchema });

export type UpsertCatalogVariantInput = z.infer<typeof UpsertCatalogVariantInputSchema>;
export type UpsertCatalogVariantOutput = z.infer<typeof UpsertCatalogVariantOutputSchema>;
