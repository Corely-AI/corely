import { z } from "zod";
import { CatalogUomDtoSchema } from "./catalog.types";

export const UpsertCatalogUomInputSchema = z.object({
  uomId: z.string().optional(),
  code: z.string().min(1),
  name: z.string().min(1),
  baseCode: z.string().optional().nullable(),
  factor: z.number().positive().optional().nullable(),
  rounding: z.number().int().nonnegative().optional().nullable(),
  idempotencyKey: z.string().optional(),
});

export const UpsertCatalogUomOutputSchema = z.object({ uom: CatalogUomDtoSchema });

export type UpsertCatalogUomInput = z.infer<typeof UpsertCatalogUomInputSchema>;
export type UpsertCatalogUomOutput = z.infer<typeof UpsertCatalogUomOutputSchema>;
