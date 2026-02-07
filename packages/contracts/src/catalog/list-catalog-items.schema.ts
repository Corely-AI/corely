import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import {
  CatalogItemDtoSchema,
  CatalogItemStatusSchema,
  CatalogItemTypeSchema,
} from "./catalog.types";

export const ListCatalogItemsInputSchema = ListQuerySchema.extend({
  status: CatalogItemStatusSchema.optional(),
  type: CatalogItemTypeSchema.optional(),
  taxProfileId: z.string().optional(),
  defaultUomId: z.string().optional(),
});

export const ListCatalogItemsOutputSchema = createListResponseSchema(CatalogItemDtoSchema);

export type ListCatalogItemsInput = z.infer<typeof ListCatalogItemsInputSchema>;
export type ListCatalogItemsOutput = z.infer<typeof ListCatalogItemsOutputSchema>;
