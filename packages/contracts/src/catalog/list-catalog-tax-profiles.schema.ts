import { type z } from "zod";
import { ListQuerySchema, createListResponseSchema } from "../common/list.contract";
import { CatalogTaxProfileDtoSchema } from "./catalog.types";

export const ListCatalogTaxProfilesInputSchema = ListQuerySchema;
export const ListCatalogTaxProfilesOutputSchema = createListResponseSchema(
  CatalogTaxProfileDtoSchema
);

export type ListCatalogTaxProfilesInput = z.infer<typeof ListCatalogTaxProfilesInputSchema>;
export type ListCatalogTaxProfilesOutput = z.infer<typeof ListCatalogTaxProfilesOutputSchema>;
