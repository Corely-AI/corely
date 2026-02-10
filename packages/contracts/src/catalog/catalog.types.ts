import { z } from "zod";
import { utcInstantSchema } from "../shared/local-date.schema";

export const CatalogItemStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type CatalogItemStatus = z.infer<typeof CatalogItemStatusSchema>;

export const CatalogItemTypeSchema = z.enum(["PRODUCT", "SERVICE"]);
export type CatalogItemType = z.infer<typeof CatalogItemTypeSchema>;

export const CatalogVariantStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type CatalogVariantStatus = z.infer<typeof CatalogVariantStatusSchema>;

export const CatalogTaxExciseTypeSchema = z.enum(["PERCENT", "AMOUNT"]);
export type CatalogTaxExciseType = z.infer<typeof CatalogTaxExciseTypeSchema>;

export const CatalogPriceListStatusSchema = z.enum(["ACTIVE", "ARCHIVED"]);
export type CatalogPriceListStatus = z.infer<typeof CatalogPriceListStatusSchema>;

export const CatalogUomDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  code: z.string(),
  name: z.string(),
  baseCode: z.string().nullable().optional(),
  factor: z.number().positive().nullable().optional(),
  rounding: z.number().int().nonnegative().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CatalogUomDto = z.infer<typeof CatalogUomDtoSchema>;

export const CatalogTaxProfileDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  vatRateBps: z.number().int().nonnegative(),
  isExciseApplicable: z.boolean(),
  exciseType: CatalogTaxExciseTypeSchema.nullable().optional(),
  exciseValue: z.number().nonnegative().nullable().optional(),
  effectiveFrom: utcInstantSchema.nullable().optional(),
  effectiveTo: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CatalogTaxProfileDto = z.infer<typeof CatalogTaxProfileDtoSchema>;

export const CatalogCategoryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  parentId: z.string().nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CatalogCategoryDto = z.infer<typeof CatalogCategoryDtoSchema>;

export const CatalogVariantBarcodeDtoSchema = z.object({
  id: z.string(),
  barcode: z.string(),
  createdAt: utcInstantSchema,
});
export type CatalogVariantBarcodeDto = z.infer<typeof CatalogVariantBarcodeDtoSchema>;

export const CatalogVariantDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  itemId: z.string(),
  sku: z.string(),
  name: z.string().nullable().optional(),
  status: CatalogVariantStatusSchema,
  attributes: z.record(z.string(), z.unknown()).nullable().optional(),
  barcodes: z.array(CatalogVariantBarcodeDtoSchema),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CatalogVariantDto = z.infer<typeof CatalogVariantDtoSchema>;

export const CatalogItemDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  status: CatalogItemStatusSchema,
  type: CatalogItemTypeSchema,
  defaultUomId: z.string(),
  taxProfileId: z.string().nullable().optional(),
  shelfLifeDays: z.number().int().nonnegative().nullable().optional(),
  requiresLotTracking: z.boolean(),
  requiresExpiryDate: z.boolean(),
  hsCode: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  categoryIds: z.array(z.string()),
  variants: z.array(CatalogVariantDtoSchema),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CatalogItemDto = z.infer<typeof CatalogItemDtoSchema>;

export const CatalogPriceListDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  currency: z.string().length(3),
  status: CatalogPriceListStatusSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  archivedAt: utcInstantSchema.nullable().optional(),
});
export type CatalogPriceListDto = z.infer<typeof CatalogPriceListDtoSchema>;

export const CatalogPriceDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  priceListId: z.string(),
  itemId: z.string().nullable().optional(),
  variantId: z.string().nullable().optional(),
  amount: z.number().nonnegative(),
  taxIncluded: z.boolean(),
  effectiveFrom: utcInstantSchema.nullable().optional(),
  effectiveTo: utcInstantSchema.nullable().optional(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
});
export type CatalogPriceDto = z.infer<typeof CatalogPriceDtoSchema>;
