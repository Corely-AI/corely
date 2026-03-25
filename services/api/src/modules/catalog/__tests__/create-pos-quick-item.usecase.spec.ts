import { describe, expect, it, vi } from "vitest";
import {
  unwrap,
  type AuditPort,
  type IdGeneratorPort,
  type LoggerPort,
  type OutboxPort,
} from "@corely/kernel";
import type {
  CatalogCategoryDto,
  CatalogItemDto,
  CatalogPriceDto,
  CatalogPriceListDto,
  CatalogTaxProfileDto,
  CatalogUomDto,
  CatalogVariantDto,
  CreatePosQuickCatalogItemInput,
} from "@corely/contracts";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { CatalogRepositoryPort } from "../application/ports/catalog-repository.port";
import { CreatePosQuickCatalogItemUseCase } from "../application/use-cases/create-pos-quick-item.usecase";

type RepoState = {
  item: CatalogItemDto | null;
  variant: CatalogVariantDto | null;
  uom: CatalogUomDto | null;
  category: CatalogCategoryDto | null;
  priceList: CatalogPriceListDto | null;
  price: CatalogPriceDto | null;
  barcodes: string[];
};

const buildRepo = (state: RepoState) => {
  const repo = {
    findItemById: vi.fn(async () =>
      state.item
        ? {
            ...state.item,
            variants: state.variant
              ? [
                  {
                    ...state.variant,
                    barcodes: state.barcodes.map((barcode) => ({
                      id: `${state.variant!.id}-${barcode}`,
                      barcode,
                      createdAt: new Date().toISOString(),
                    })),
                  },
                ]
              : [],
          }
        : null
    ),
    findItemByCode: vi.fn(async (_scope, code: string) =>
      state.item?.code === code ? state.item : null
    ),
    createItem: vi.fn(async (_scope, item: Omit<CatalogItemDto, "variants">) => {
      state.item = { ...item, variants: [] };
    }),
    updateItem: vi.fn(),
    listItems: vi.fn(),
    countActiveVariants: vi.fn(),
    replaceItemCategoryIds: vi.fn(async (_scope, _itemId: string, categoryIds: string[]) => {
      if (state.item) {
        state.item = { ...state.item, categoryIds };
      }
    }),
    findVariantById: vi.fn(async () =>
      state.variant
        ? {
            ...state.variant,
            barcodes: state.barcodes.map((barcode) => ({
              id: `${state.variant!.id}-${barcode}`,
              barcode,
              createdAt: new Date().toISOString(),
            })),
          }
        : null
    ),
    findVariantBySku: vi.fn(async (_scope, sku: string) =>
      state.variant?.sku === sku ? state.variant : null
    ),
    upsertVariant: vi.fn(async (_scope, variant: CatalogVariantDto) => {
      state.variant = { ...variant, barcodes: [] };
    }),
    replaceVariantBarcodes: vi.fn(async (_scope, _variantId: string, barcodes: string[]) => {
      state.barcodes = barcodes;
    }),
    findUomByCode: vi.fn(async (_scope, code: string) =>
      state.uom?.code === code ? state.uom : null
    ),
    upsertUom: vi.fn(async (_scope, uom: CatalogUomDto) => {
      state.uom = uom;
    }),
    listUoms: vi.fn(),
    findTaxProfileByName: vi.fn<() => Promise<CatalogTaxProfileDto | null>>(async () => null),
    upsertTaxProfile: vi.fn(),
    listTaxProfiles: vi.fn(),
    findCategoryByName: vi.fn(async (_scope, name: string) =>
      state.category?.name === name ? state.category : null
    ),
    upsertCategory: vi.fn(async (_scope, category: CatalogCategoryDto) => {
      state.category = category;
    }),
    listCategories: vi.fn(),
    findPriceListByName: vi.fn(async (_scope, name: string) =>
      state.priceList?.name === name ? state.priceList : null
    ),
    upsertPriceList: vi.fn(async (_scope, priceList: CatalogPriceListDto) => {
      state.priceList = priceList;
    }),
    listPriceLists: vi.fn(async () => ({
      items: state.priceList ? [state.priceList] : [],
      total: state.priceList ? 1 : 0,
    })),
    upsertPrice: vi.fn(async (_scope, price: CatalogPriceDto) => {
      state.price = price;
    }),
    listPrices: vi.fn(),
  } satisfies CatalogRepositoryPort;

  return repo;
};

const buildIdempotency = (): IdempotencyStoragePort => {
  const store = new Map<string, { body: unknown }>();
  return {
    get: vi.fn(async (action, tenantId, key) => store.get(`${action}:${tenantId}:${key}`) ?? null),
    store: vi.fn(async (action, tenantId, key, value) => {
      store.set(`${action}:${tenantId}:${key}`, value);
    }),
  };
};

describe("CreatePosQuickCatalogItemUseCase", () => {
  it("creates a sellable POS item and provisions default support records when needed", async () => {
    const state: RepoState = {
      item: null,
      variant: null,
      uom: null,
      category: null,
      priceList: null,
      price: null,
      barcodes: [],
    };
    const repo = buildRepo(state);
    const audit: AuditPort = { log: vi.fn(async () => undefined) };
    const outbox: OutboxPort = { enqueue: vi.fn(async () => undefined) };
    const idempotency = buildIdempotency();
    const idGenerator: IdGeneratorPort = {
      newId: vi
        .fn()
        .mockReturnValueOnce("uom-1")
        .mockReturnValueOnce("price-list-1")
        .mockReturnValueOnce("category-1")
        .mockReturnValueOnce("item-1")
        .mockReturnValueOnce("variant-1")
        .mockReturnValueOnce("price-1"),
    };
    const logger: LoggerPort = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const useCase = new CreatePosQuickCatalogItemUseCase({
      logger,
      repo,
      idGenerator,
      clock: { now: () => new Date("2026-03-25T18:00:00.000Z") },
      audit,
      outbox,
      idempotency,
    });

    const input: CreatePosQuickCatalogItemInput = {
      name: "Pho dac biet",
      amount: 14.9,
      currency: "EUR",
      categoryName: "Dinner Specials",
      barcode: "1234567890123",
      idempotencyKey: "quick-add-1",
    };

    const result = unwrap(
      await useCase.execute(input, {
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        userId: "user-1",
        correlationId: "corr-1",
        surfaceId: "pos",
      })
    );

    expect(result.item.code).toBe("PHO-DAC-BIET");
    expect(result.variant.sku).toBe("PHO-DAC-BIET");
    expect(result.price.amount).toBe(14.9);
    expect(result.support.defaultUomId).toBe("uom-1");
    expect(result.support.priceListId).toBe("price-list-1");
    expect(result.support.categoryId).toBe("category-1");
    expect(repo.upsertUom).toHaveBeenCalledTimes(1);
    expect(repo.upsertPriceList).toHaveBeenCalledTimes(1);
    expect(repo.upsertCategory).toHaveBeenCalledTimes(1);
    expect(repo.replaceVariantBarcodes).toHaveBeenCalledWith(
      { tenantId: "tenant-1", workspaceId: "ws-1" },
      "variant-1",
      ["1234567890123"]
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
  });

  it("returns the cached result on idempotent retry", async () => {
    const state: RepoState = {
      item: null,
      variant: null,
      uom: null,
      category: null,
      priceList: null,
      price: null,
      barcodes: [],
    };
    const repo = buildRepo(state);
    const idempotency = buildIdempotency();

    const useCase = new CreatePosQuickCatalogItemUseCase({
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      repo,
      idGenerator: {
        newId: vi
          .fn()
          .mockReturnValueOnce("uom-1")
          .mockReturnValueOnce("price-list-1")
          .mockReturnValueOnce("item-1")
          .mockReturnValueOnce("variant-1")
          .mockReturnValueOnce("price-1"),
      },
      clock: { now: () => new Date("2026-03-25T18:00:00.000Z") },
      audit: { log: vi.fn(async () => undefined) },
      outbox: { enqueue: vi.fn(async () => undefined) },
      idempotency,
    });

    const input: CreatePosQuickCatalogItemInput = {
      name: "Iced tea",
      amount: 3.5,
      currency: "EUR",
      idempotencyKey: "quick-add-2",
    };
    const ctx = {
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      correlationId: "corr-1",
      surfaceId: "pos" as const,
    };

    const first = unwrap(await useCase.execute(input, ctx));
    const second = unwrap(await useCase.execute(input, ctx));

    expect(second.item.id).toBe(first.item.id);
    expect(repo.createItem).toHaveBeenCalledTimes(1);
    expect(repo.upsertVariant).toHaveBeenCalledTimes(1);
    expect(repo.upsertPrice).toHaveBeenCalledTimes(1);
  });
});
