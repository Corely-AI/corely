import { type z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { CatalogPriceListDtoSchema, CatalogPriceListStatusSchema } from "./catalog.types";

export const ListCatalogPriceListsInputSchema = ListQuerySchema.extend({
  status: CatalogPriceListStatusSchema.optional(),
});

export const ListCatalogPriceListsOutputSchema =
  createListResponseSchema(CatalogPriceListDtoSchema);

export type ListCatalogPriceListsInput = z.infer<typeof ListCatalogPriceListsInputSchema>;
export type ListCatalogPriceListsOutput = z.infer<typeof ListCatalogPriceListsOutputSchema>;
