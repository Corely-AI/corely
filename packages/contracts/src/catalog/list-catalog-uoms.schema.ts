import { type z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { CatalogUomDtoSchema } from "./catalog.types";

export const ListCatalogUomsInputSchema = ListQuerySchema;
export const ListCatalogUomsOutputSchema = createListResponseSchema(CatalogUomDtoSchema);

export type ListCatalogUomsInput = z.infer<typeof ListCatalogUomsInputSchema>;
export type ListCatalogUomsOutput = z.infer<typeof ListCatalogUomsOutputSchema>;
