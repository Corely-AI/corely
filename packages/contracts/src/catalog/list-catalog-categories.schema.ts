import { z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { CatalogCategoryDtoSchema } from "./catalog.types";

export const ListCatalogCategoriesInputSchema = ListQuerySchema.extend({
  parentId: z.string().optional(),
});

export const ListCatalogCategoriesOutputSchema = createListResponseSchema(CatalogCategoryDtoSchema);

export type ListCatalogCategoriesInput = z.infer<typeof ListCatalogCategoriesInputSchema>;
export type ListCatalogCategoriesOutput = z.infer<typeof ListCatalogCategoriesOutputSchema>;
