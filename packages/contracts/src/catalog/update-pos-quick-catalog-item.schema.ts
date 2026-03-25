import { z } from "zod";
import {
  CatalogItemDtoSchema,
  CatalogPriceDtoSchema,
  CatalogVariantDtoSchema,
} from "./catalog.types";

export const UpdatePosQuickCatalogItemInputSchema = z
  .object({
    itemId: z.string(),
    name: z.string().min(1),
    description: z.string().optional().nullable(),
    amount: z.number().positive(),
    categoryId: z.string().optional().nullable(),
    categoryName: z.string().optional().nullable(),
    taxProfileId: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    idempotencyKey: z.string().optional(),
  })
  .refine((value) => !(value.categoryId && value.categoryName), {
    message: "Provide either categoryId or categoryName",
    path: ["categoryName"],
  });

export const UpdatePosQuickCatalogItemOutputSchema = z.object({
  item: CatalogItemDtoSchema,
  variant: CatalogVariantDtoSchema,
  price: CatalogPriceDtoSchema,
  support: z.object({
    priceListId: z.string(),
    categoryId: z.string().nullable(),
  }),
});

export type UpdatePosQuickCatalogItemInput = z.infer<typeof UpdatePosQuickCatalogItemInputSchema>;
export type UpdatePosQuickCatalogItemOutput = z.infer<typeof UpdatePosQuickCatalogItemOutputSchema>;
