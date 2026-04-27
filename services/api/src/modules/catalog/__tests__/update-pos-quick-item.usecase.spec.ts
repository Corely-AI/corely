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
  UpdatePosQuickCatalogItemInput,
} from "@corely/contracts";
import type { IdempotencyStoragePort } from "@/shared/ports/idempotency-storage.port";
import type { CatalogRepositoryPort } from "../application/ports/catalog-repository.port";
import { UpdatePosQuickCatalogItemUseCase } from "../application/use-cases/update-pos-quick-item.usecase";

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
    createItem: vi.fn(),
    updateItem: vi.fn(async (_scope, item: Omit<CatalogItemDto, "variants">) => {
      state.item = { ...item, variants: [] };
    }),
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
    upsertUom: vi.fn(),
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
    listPrices: vi.fn(async () => ({
      items: state.price ? [state.price] : [],
      total: state.price ? 1 : 0,
    })),
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

describe("UpdatePosQuickCatalogItemUseCase", () => {
  it("updates POS-safe item fields, price, and barcode without requiring full catalog.write", async () => {
    const state: RepoState = {
      item: {
        id: "item-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        code: "PHO-DAC-BIET",
        name: "Pho dac biet",
        description: "Original",
        status: "ACTIVE",
        type: "PRODUCT",
        defaultUomId: "uom-1",
        taxProfileId: "tax-1",
        shelfLifeDays: null,
        requiresLotTracking: false,
        requiresExpiryDate: false,
        hsCode: null,
        metadata: { createdFromSurface: "pos" },
        categoryIds: ["category-1"],
        variants: [],
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      variant: {
        id: "variant-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        itemId: "item-1",
        sku: "PHO-DAC-BIET",
        name: "Pho dac biet",
        status: "ACTIVE",
        attributes: null,
        barcodes: [],
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      uom: null,
      category: {
        id: "category-2",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        name: "Dinner Specials",
        parentId: null,
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      priceList: {
        id: "price-list-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        name: "POS Sell Prices",
        currency: "EUR",
        status: "ACTIVE",
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      price: {
        id: "price-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        priceListId: "price-list-1",
        itemId: "item-1",
        variantId: "variant-1",
        amount: 14.9,
        taxIncluded: true,
        effectiveFrom: null,
        effectiveTo: null,
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
      },
      barcodes: ["1234567890123"],
    };

    const repo = buildRepo(state);
    const audit: AuditPort = { log: vi.fn(async () => undefined) };
    const outbox: OutboxPort = { enqueue: vi.fn(async () => undefined) };
    const idempotency = buildIdempotency();
    const idGenerator: IdGeneratorPort = { newId: vi.fn().mockReturnValue("generated-id") };
    const logger: LoggerPort = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    const useCase = new UpdatePosQuickCatalogItemUseCase({
      logger,
      repo,
      idGenerator,
      clock: { now: () => new Date("2026-03-25T19:00:00.000Z") },
      audit,
      outbox,
      idempotency,
    });

    const input: UpdatePosQuickCatalogItemInput = {
      itemId: "item-1",
      name: "Pho dac biet large",
      description: "Updated",
      amount: 16.5,
      categoryId: "category-2",
      taxProfileId: "tax-2",
      sku: "PHO-DAC-BIET-L",
      barcode: "9990001112223",
      idempotencyKey: "quick-edit-1",
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

    expect(result.item.name).toBe("Pho dac biet large");
    expect(result.item.categoryIds).toEqual(["category-2"]);
    expect(result.variant.sku).toBe("PHO-DAC-BIET-L");
    expect(result.price.amount).toBe(16.5);
    expect(repo.replaceVariantBarcodes).toHaveBeenCalledWith(
      { tenantId: "tenant-1", workspaceId: "ws-1" },
      "variant-1",
      ["9990001112223"]
    );
    expect(audit.log).toHaveBeenCalledTimes(1);
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
  });

  it("returns cached output on idempotent retry", async () => {
    const state: RepoState = {
      item: {
        id: "item-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        code: "PHO-DAC-BIET",
        name: "Pho dac biet",
        description: null,
        status: "ACTIVE",
        type: "PRODUCT",
        defaultUomId: "uom-1",
        taxProfileId: null,
        shelfLifeDays: null,
        requiresLotTracking: false,
        requiresExpiryDate: false,
        hsCode: null,
        metadata: null,
        categoryIds: [],
        variants: [],
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      variant: {
        id: "variant-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        itemId: "item-1",
        sku: "PHO-DAC-BIET",
        name: "Pho dac biet",
        status: "ACTIVE",
        attributes: null,
        barcodes: [],
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      uom: null,
      category: null,
      priceList: {
        id: "price-list-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        name: "POS Sell Prices",
        currency: "EUR",
        status: "ACTIVE",
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
        archivedAt: null,
      },
      price: {
        id: "price-1",
        tenantId: "tenant-1",
        workspaceId: "ws-1",
        priceListId: "price-list-1",
        itemId: "item-1",
        variantId: "variant-1",
        amount: 14.9,
        taxIncluded: true,
        effectiveFrom: null,
        effectiveTo: null,
        createdAt: "2026-03-25T18:00:00.000Z",
        updatedAt: "2026-03-25T18:00:00.000Z",
      },
      barcodes: [],
    };

    const repo = buildRepo(state);
    const idempotency = buildIdempotency();

    const useCase = new UpdatePosQuickCatalogItemUseCase({
      logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      repo,
      idGenerator: { newId: vi.fn().mockReturnValue("generated-id") },
      clock: { now: () => new Date("2026-03-25T19:00:00.000Z") },
      audit: { log: vi.fn(async () => undefined) },
      outbox: { enqueue: vi.fn(async () => undefined) },
      idempotency,
    });

    const input: UpdatePosQuickCatalogItemInput = {
      itemId: "item-1",
      name: "Pho dac biet updated",
      amount: 18,
      idempotencyKey: "same-key",
    };

    const first = unwrap(
      await useCase.execute(input, {
        tenantId: "tenant-1",
        workspaceId: "ws-1",
      })
    );
    const second = unwrap(
      await useCase.execute(input, {
        tenantId: "tenant-1",
        workspaceId: "ws-1",
      })
    );

    expect(second).toEqual(first);
    expect(repo.updateItem).toHaveBeenCalledTimes(1);
  });
});
