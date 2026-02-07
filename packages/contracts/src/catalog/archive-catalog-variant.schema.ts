import { z } from "zod";
import { CatalogVariantDtoSchema } from "./catalog.types";

export const ArchiveCatalogVariantInputSchema = z.object({ variantId: z.string() });
export const ArchiveCatalogVariantOutputSchema = z.object({ variant: CatalogVariantDtoSchema });

export type ArchiveCatalogVariantInput = z.infer<typeof ArchiveCatalogVariantInputSchema>;
export type ArchiveCatalogVariantOutput = z.infer<typeof ArchiveCatalogVariantOutputSchema>;
