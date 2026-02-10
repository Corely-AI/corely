import { z } from "zod";
import {
  CatalogItemDtoSchema,
  CatalogItemStatusSchema,
  CatalogItemTypeSchema,
} from "./catalog.types";

export const UpdateCatalogItemInputSchema = z.object({
  itemId: z.string(),
  patch: z.object({
    code: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    status: CatalogItemStatusSchema.optional(),
    type: CatalogItemTypeSchema.optional(),
    defaultUomId: z.string().min(1).optional(),
    taxProfileId: z.string().optional().nullable(),
    shelfLifeDays: z.number().int().nonnegative().optional().nullable(),
    requiresLotTracking: z.boolean().optional(),
    requiresExpiryDate: z.boolean().optional(),
    hsCode: z.string().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
    categoryIds: z.array(z.string()).optional(),
  }),
});

export const UpdateCatalogItemOutputSchema = z.object({ item: CatalogItemDtoSchema });

export type UpdateCatalogItemInput = z.infer<typeof UpdateCatalogItemInputSchema>;
export type UpdateCatalogItemOutput = z.infer<typeof UpdateCatalogItemOutputSchema>;
