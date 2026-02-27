import { HttpError } from "@corely/api-client";
import {
  GetCatalogItemOutputSchema,
  ListCatalogCategoriesOutputSchema,
  ListCatalogItemsOutputSchema,
  ListCatalogPriceListsOutputSchema,
  ListCatalogPricesOutputSchema,
} from "@corely/contracts";
import type {
  CatalogItemDto,
  ListCatalogCategoriesOutput,
  ListCatalogItemsOutput,
  ListCatalogPriceListsOutput,
  ListCatalogPricesOutput,
} from "@corely/contracts";
import type { ZodType } from "zod";
import type {
  CatalogCategoriesParams,
  CatalogItemsParams,
  CatalogPriceListsParams,
  CatalogPricesParams,
} from "./query-keys";
import { withQuery } from "@/lib/urls";

type ScopeParams = {
  workspaceSlug?: string | null;
  workspaceId?: string | null;
};

const toScopeParams = (scope: ScopeParams) => ({
  workspaceSlug: scope.workspaceSlug ?? undefined,
  workspaceId: scope.workspaceId ?? undefined,
});

const readErrorBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response.text().catch(() => null);
  }
  return response.json().catch(() => null);
};

const requestJson = async <T>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  schema: ZodType<T>
): Promise<T> => {
  const url = withQuery(path, params);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "same-origin",
  });

  if (!response.ok) {
    const body = await readErrorBody(response);
    throw new HttpError(response.statusText, response.status, body);
  }

  const payload = await response.json();
  return schema.parse(payload);
};

export const catalogApi = {
  listItems: (params: CatalogItemsParams): Promise<ListCatalogItemsOutput> =>
    requestJson(
      "/api/ecommerce/catalog/items",
      {
        q: params.q,
        page: params.page,
        pageSize: params.pageSize,
        ...toScopeParams(params),
      },
      ListCatalogItemsOutputSchema
    ),

  getItem: async (itemId: string, scope: ScopeParams): Promise<CatalogItemDto> => {
    const payload = await requestJson(
      `/api/ecommerce/catalog/items/${itemId}`,
      {
        ...toScopeParams(scope),
      },
      GetCatalogItemOutputSchema
    );
    return payload.item;
  },

  listCategories: (params: CatalogCategoriesParams): Promise<ListCatalogCategoriesOutput> =>
    requestJson(
      "/api/ecommerce/catalog/categories",
      {
        page: params.page,
        pageSize: params.pageSize,
        ...toScopeParams(params),
      },
      ListCatalogCategoriesOutputSchema
    ),

  listPriceLists: (params: CatalogPriceListsParams): Promise<ListCatalogPriceListsOutput> =>
    requestJson(
      "/api/ecommerce/catalog/price-lists",
      {
        page: params.page,
        pageSize: params.pageSize,
        ...toScopeParams(params),
      },
      ListCatalogPriceListsOutputSchema
    ),

  listPrices: (params: CatalogPricesParams): Promise<ListCatalogPricesOutput> =>
    requestJson(
      "/api/ecommerce/catalog/prices",
      {
        page: params.page,
        pageSize: params.pageSize,
        priceListId: params.priceListId,
        itemId: params.itemId,
        variantId: params.variantId,
        ...toScopeParams(params),
      },
      ListCatalogPricesOutputSchema
    ),
};
