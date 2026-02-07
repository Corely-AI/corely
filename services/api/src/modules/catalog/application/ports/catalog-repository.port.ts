import type {
  CatalogCategoryDto,
  CatalogItemDto,
  CatalogPriceDto,
  CatalogPriceListDto,
  CatalogTaxProfileDto,
  CatalogUomDto,
  CatalogVariantDto,
} from "@corely/contracts";

export type CatalogListParams = {
  q?: string;
  page: number;
  pageSize: number;
  sort?: string;
  filters?: unknown;
  status?: string;
  type?: string;
  parentId?: string;
  priceListId?: string;
  itemId?: string;
  variantId?: string;
};

export type CatalogScope = {
  tenantId: string;
  workspaceId: string;
};

export type CatalogListResult<T> = {
  items: T[];
  total: number;
};

export const CATALOG_REPOSITORY = "catalog/repository";

export interface CatalogRepositoryPort {
  findItemById(scope: CatalogScope, itemId: string): Promise<CatalogItemDto | null>;
  findItemByCode(scope: CatalogScope, code: string): Promise<CatalogItemDto | null>;
  createItem(scope: CatalogScope, item: Omit<CatalogItemDto, "variants">): Promise<void>;
  updateItem(scope: CatalogScope, item: Omit<CatalogItemDto, "variants">): Promise<void>;
  listItems(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogItemDto>>;
  countActiveVariants(scope: CatalogScope, itemId: string): Promise<number>;

  replaceItemCategoryIds(scope: CatalogScope, itemId: string, categoryIds: string[]): Promise<void>;

  findVariantById(scope: CatalogScope, variantId: string): Promise<CatalogVariantDto | null>;
  findVariantBySku(scope: CatalogScope, sku: string): Promise<CatalogVariantDto | null>;
  upsertVariant(scope: CatalogScope, variant: CatalogVariantDto): Promise<void>;
  replaceVariantBarcodes(scope: CatalogScope, variantId: string, barcodes: string[]): Promise<void>;

  findUomByCode(scope: CatalogScope, code: string): Promise<CatalogUomDto | null>;
  upsertUom(scope: CatalogScope, uom: CatalogUomDto): Promise<void>;
  listUoms(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogUomDto>>;

  findTaxProfileByName(scope: CatalogScope, name: string): Promise<CatalogTaxProfileDto | null>;
  upsertTaxProfile(scope: CatalogScope, taxProfile: CatalogTaxProfileDto): Promise<void>;
  listTaxProfiles(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogTaxProfileDto>>;

  findCategoryByName(scope: CatalogScope, name: string): Promise<CatalogCategoryDto | null>;
  upsertCategory(scope: CatalogScope, category: CatalogCategoryDto): Promise<void>;
  listCategories(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogCategoryDto>>;

  findPriceListByName(scope: CatalogScope, name: string): Promise<CatalogPriceListDto | null>;
  upsertPriceList(scope: CatalogScope, priceList: CatalogPriceListDto): Promise<void>;
  listPriceLists(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogPriceListDto>>;

  upsertPrice(scope: CatalogScope, price: CatalogPriceDto): Promise<void>;
  listPrices(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogPriceDto>>;
}
