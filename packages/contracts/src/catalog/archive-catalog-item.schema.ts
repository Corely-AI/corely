import { z } from "zod";
import { CatalogItemDtoSchema } from "./catalog.types";

export const ArchiveCatalogItemInputSchema = z.object({ itemId: z.string() });
export const ArchiveCatalogItemOutputSchema = z.object({ item: CatalogItemDtoSchema });

export type ArchiveCatalogItemInput = z.infer<typeof ArchiveCatalogItemInputSchema>;
export type ArchiveCatalogItemOutput = z.infer<typeof ArchiveCatalogItemOutputSchema>;
