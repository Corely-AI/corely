import { z } from "zod";
import { CatalogItemDtoSchema } from "./catalog.types";

export const GetCatalogItemInputSchema = z.object({ itemId: z.string() });
export const GetCatalogItemOutputSchema = z.object({ item: CatalogItemDtoSchema });

export type GetCatalogItemInput = z.infer<typeof GetCatalogItemInputSchema>;
export type GetCatalogItemOutput = z.infer<typeof GetCatalogItemOutputSchema>;
