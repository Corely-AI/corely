import { z } from "zod";
import { CatalogItemDtoSchema, CatalogItemTypeSchema } from "./catalog.types";

export const CreateCatalogItemInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  type: CatalogItemTypeSchema,
  defaultUomId: z.string().min(1),
  taxProfileId: z.string().optional().nullable(),
  shelfLifeDays: z.number().int().nonnegative().optional().nullable(),
  requiresLotTracking: z.boolean().default(false),
  requiresExpiryDate: z.boolean().default(false),
  hsCode: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  categoryIds: z.array(z.string()).optional(),
  idempotencyKey: z.string().optional(),
});

export const CreateCatalogItemOutputSchema = z.object({ item: CatalogItemDtoSchema });

export type CreateCatalogItemInput = z.infer<typeof CreateCatalogItemInputSchema>;
export type CreateCatalogItemOutput = z.infer<typeof CreateCatalogItemOutputSchema>;
