import type {
  ListCatalogCategoriesInput,
  ListCatalogItemsInput,
  ListCatalogPriceListsInput,
  ListCatalogPricesInput,
} from "@corely/contracts";

type ScopeParams = {
  workspaceSlug?: string | null;
  workspaceId?: string | null;
};

export type CatalogItemsParams = Pick<ListCatalogItemsInput, "q" | "page" | "pageSize"> &
  ScopeParams;

export type CatalogCategoriesParams = Pick<ListCatalogCategoriesInput, "page" | "pageSize"> &
  ScopeParams;

export type CatalogPriceListsParams = Pick<ListCatalogPriceListsInput, "page" | "pageSize"> &
  ScopeParams;

export type CatalogPricesParams = Pick<
  ListCatalogPricesInput,
  "page" | "pageSize" | "priceListId" | "itemId" | "variantId"
> &
  ScopeParams;

export const catalogQueryKeys = {
  items: (params: CatalogItemsParams) => ["catalog", "items", params] as const,
  item: (itemId: string) => ["catalog", "item", itemId] as const,
  categories: (params: CatalogCategoriesParams) => ["catalog", "categories", params] as const,
  prices: (params: CatalogPricesParams) => ["catalog", "prices", params] as const,
  priceLists: (params: CatalogPriceListsParams) => ["catalog", "price-lists", params] as const,
};
