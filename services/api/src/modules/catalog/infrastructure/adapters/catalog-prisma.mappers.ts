import type {
  CatalogCategoryDto,
  CatalogItemDto,
  CatalogPriceDto,
  CatalogPriceListDto,
  CatalogTaxProfileDto,
  CatalogUomDto,
  CatalogVariantDto,
} from "@corely/contracts";

export const toCatalogVariantDto = (variant: any): CatalogVariantDto => {
  return {
    id: variant.id,
    tenantId: variant.tenantId,
    workspaceId: variant.workspaceId,
    itemId: variant.itemId,
    sku: variant.sku,
    name: variant.name ?? null,
    status: variant.status,
    attributes: (variant.attributes as Record<string, unknown> | null | undefined) ?? null,
    barcodes: (variant.barcodes ?? []).map((barcode: any) => ({
      id: barcode.id,
      barcode: barcode.barcode,
      createdAt: barcode.createdAt.toISOString(),
    })),
    createdAt: variant.createdAt.toISOString(),
    updatedAt: variant.updatedAt.toISOString(),
    archivedAt: variant.archivedAt ? variant.archivedAt.toISOString() : null,
  };
};

export const toCatalogItemDto = (item: any): CatalogItemDto => {
  return {
    id: item.id,
    tenantId: item.tenantId,
    workspaceId: item.workspaceId,
    code: item.code,
    name: item.name,
    description: item.description ?? null,
    status: item.status,
    type: item.type,
    defaultUomId: item.defaultUomId,
    taxProfileId: item.taxProfileId ?? null,
    shelfLifeDays: item.shelfLifeDays ?? null,
    requiresLotTracking: item.requiresLotTracking,
    requiresExpiryDate: item.requiresExpiryDate,
    hsCode: item.hsCode ?? null,
    metadata: (item.metadata as Record<string, unknown> | null | undefined) ?? null,
    categoryIds: (item.categories ?? []).map((entry: { categoryId: string }) => entry.categoryId),
    variants: (item.variants ?? []).map((variant: any) => toCatalogVariantDto(variant)),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    archivedAt: item.archivedAt ? item.archivedAt.toISOString() : null,
  };
};

export const toCatalogUomDto = (uom: any): CatalogUomDto => {
  return {
    id: uom.id,
    tenantId: uom.tenantId,
    workspaceId: uom.workspaceId,
    code: uom.code,
    name: uom.name,
    baseCode: uom.baseCode ?? null,
    factor: uom.factor ? Number(uom.factor) : null,
    rounding: uom.rounding ?? null,
    createdAt: uom.createdAt.toISOString(),
    updatedAt: uom.updatedAt.toISOString(),
  };
};

export const toCatalogTaxProfileDto = (row: any): CatalogTaxProfileDto => {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    name: row.name,
    vatRateBps: row.vatRateBps,
    isExciseApplicable: row.isExciseApplicable,
    exciseType: row.exciseType ?? null,
    exciseValue: row.exciseValue ? Number(row.exciseValue) : null,
    effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
};

export const toCatalogCategoryDto = (row: any): CatalogCategoryDto => {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    name: row.name,
    parentId: row.parentId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
};

export const toCatalogPriceListDto = (row: any): CatalogPriceListDto => {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    name: row.name,
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
  };
};

export const toCatalogPriceDto = (row: any): CatalogPriceDto => {
  return {
    id: row.id,
    tenantId: row.tenantId,
    workspaceId: row.workspaceId,
    priceListId: row.priceListId,
    itemId: row.itemId ?? null,
    variantId: row.variantId ?? null,
    amount: Number(row.amount),
    taxIncluded: row.taxIncluded,
    effectiveFrom: row.effectiveFrom ? row.effectiveFrom.toISOString() : null,
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};
