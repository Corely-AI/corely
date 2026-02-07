import { z } from "zod";
import { CatalogCategoryDtoSchema } from "./catalog.types";

export const UpsertCatalogCategoryInputSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpsertCatalogCategoryOutputSchema = z.object({ category: CatalogCategoryDtoSchema });

export type UpsertCatalogCategoryInput = z.infer<typeof UpsertCatalogCategoryInputSchema>;
export type UpsertCatalogCategoryOutput = z.infer<typeof UpsertCatalogCategoryOutputSchema>;
