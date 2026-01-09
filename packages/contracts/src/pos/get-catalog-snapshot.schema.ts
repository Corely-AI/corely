import { z } from "zod";

/**
 * Product snapshot for offline cache
 */
export const ProductSnapshotSchema = z.object({
  productId: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  barcode: z.string().nullable(),
  priceCents: z.number().int().nonnegative(),
  taxable: z.boolean().default(false),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
  estimatedQty: z.number().int().nullable(), // On-hand quantity estimate
});

export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

/**
 * Get Catalog Snapshot input schema
 */
export const GetCatalogSnapshotInputSchema = z.object({
  warehouseId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(1000).default(500),
  offset: z.number().int().nonnegative().default(0),
  updatedSince: z.coerce.date().optional(), // For incremental sync
});

export type GetCatalogSnapshotInput = z.infer<typeof GetCatalogSnapshotInputSchema>;

/**
 * Get Catalog Snapshot output schema
 */
export const GetCatalogSnapshotOutputSchema = z.object({
  products: z.array(ProductSnapshotSchema),
  hasMore: z.boolean(),
  total: z.number().int().nonnegative(),
});

export type GetCatalogSnapshotOutput = z.infer<typeof GetCatalogSnapshotOutputSchema>;
