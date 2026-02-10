import type {
  ArchiveCatalogItemOutput,
  ArchiveCatalogVariantOutput,
  CreateCatalogItemInput,
  CreateCatalogItemOutput,
  GetCatalogItemOutput,
  ListCatalogCategoriesInput,
  ListCatalogCategoriesOutput,
  ListCatalogItemsInput,
  ListCatalogItemsOutput,
  ListCatalogPriceListsInput,
  ListCatalogPriceListsOutput,
  ListCatalogPricesInput,
  ListCatalogPricesOutput,
  ListCatalogTaxProfilesInput,
  ListCatalogTaxProfilesOutput,
  ListCatalogUomsInput,
  ListCatalogUomsOutput,
  UpdateCatalogItemInput,
  UpdateCatalogItemOutput,
  UpsertCatalogCategoryInput,
  UpsertCatalogCategoryOutput,
  UpsertCatalogPriceInput,
  UpsertCatalogPriceListInput,
  UpsertCatalogPriceListOutput,
  UpsertCatalogPriceOutput,
  UpsertCatalogTaxProfileInput,
  UpsertCatalogTaxProfileOutput,
  UpsertCatalogUomInput,
  UpsertCatalogUomOutput,
  UpsertCatalogVariantInput,
  UpsertCatalogVariantOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

const toQuery = (params?: Record<string, unknown>) => {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : "";
};

export class CatalogApi {
  async listItems(params?: ListCatalogItemsInput): Promise<ListCatalogItemsOutput> {
    return apiClient.get(`/catalog/items${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createItem(input: CreateCatalogItemInput): Promise<CreateCatalogItemOutput> {
    return apiClient.post("/catalog/items", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getItem(itemId: string): Promise<GetCatalogItemOutput> {
    return apiClient.get(`/catalog/items/${itemId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async updateItem(
    itemId: string,
    input: UpdateCatalogItemInput
  ): Promise<UpdateCatalogItemOutput> {
    return apiClient.patch(`/catalog/items/${itemId}`, input, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async archiveItem(itemId: string): Promise<ArchiveCatalogItemOutput> {
    return apiClient.post(
      `/catalog/items/${itemId}/archive`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async upsertVariant(
    itemId: string,
    input: UpsertCatalogVariantInput
  ): Promise<UpsertCatalogVariantOutput> {
    return apiClient.post(`/catalog/items/${itemId}/variants`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async archiveVariant(variantId: string): Promise<ArchiveCatalogVariantOutput> {
    return apiClient.post(
      `/catalog/variants/${variantId}/archive`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async listUoms(params?: ListCatalogUomsInput): Promise<ListCatalogUomsOutput> {
    return apiClient.get(`/catalog/uoms${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertUom(input: UpsertCatalogUomInput): Promise<UpsertCatalogUomOutput> {
    return apiClient.post(`/catalog/uoms`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listTaxProfiles(
    params?: ListCatalogTaxProfilesInput
  ): Promise<ListCatalogTaxProfilesOutput> {
    return apiClient.get(`/catalog/tax-profiles${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertTaxProfile(
    input: UpsertCatalogTaxProfileInput
  ): Promise<UpsertCatalogTaxProfileOutput> {
    return apiClient.post(`/catalog/tax-profiles`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listCategories(params?: ListCatalogCategoriesInput): Promise<ListCatalogCategoriesOutput> {
    return apiClient.get(`/catalog/categories${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertCategory(input: UpsertCatalogCategoryInput): Promise<UpsertCatalogCategoryOutput> {
    return apiClient.post(`/catalog/categories`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listPriceLists(params?: ListCatalogPriceListsInput): Promise<ListCatalogPriceListsOutput> {
    return apiClient.get(`/catalog/price-lists${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertPriceList(input: UpsertCatalogPriceListInput): Promise<UpsertCatalogPriceListOutput> {
    return apiClient.post(`/catalog/price-lists`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listPrices(params?: ListCatalogPricesInput): Promise<ListCatalogPricesOutput> {
    return apiClient.get(`/catalog/prices${toQuery(params as any)}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertPrice(input: UpsertCatalogPriceInput): Promise<UpsertCatalogPriceOutput> {
    return apiClient.post(`/catalog/prices`, input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const catalogApi = new CatalogApi();
