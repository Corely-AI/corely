import { z } from "zod";
import {
  CatalogItemDtoSchema,
  CatalogPriceDtoSchema,
  CatalogVariantDtoSchema,
} from "./catalog.types";

export const CreatePosQuickCatalogItemInputSchema = z
  .object({
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    amount: z.number().positive(),
    currency: z.string().length(3),
    code: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    taxProfileId: z.string().optional().nullable(),
    idempotencyKey: z.string().optional(),
  })
  .refine((value) => !(value.categoryId && value.categoryName), {
    message: "Provide either categoryId or categoryName",
    path: ["categoryName"],
  });

export const CreatePosQuickCatalogItemOutputSchema = z.object({
  item: CatalogItemDtoSchema,
  variant: CatalogVariantDtoSchema,
  price: CatalogPriceDtoSchema,
  support: z.object({
    priceListId: z.string(),
    defaultUomId: z.string(),
    categoryId: z.string().nullable(),
  }),
});

export type CreatePosQuickCatalogItemInput = z.infer<typeof CreatePosQuickCatalogItemInputSchema>;
export type CreatePosQuickCatalogItemOutput = z.infer<typeof CreatePosQuickCatalogItemOutputSchema>;
