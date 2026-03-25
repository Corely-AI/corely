import { describe, expect, it } from "vitest";
import type { CatalogRepositoryPort } from "@/modules/catalog/application/ports/catalog-repository.port";
import { GetCatalogSnapshotUseCase } from "./get-catalog-snapshot.usecase";

function createCatalogRepo(): CatalogRepositoryPort {
  return {
    findItemById: async () => null,
    findItemByCode: async () => null,
    createItem: async () => undefined,
    updateItem: async () => undefined,
    listItems: async () => ({
      items: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          code: "PHO-BO",
          name: "Pho Bo",
          description: "Beef noodle soup",
          status: "ACTIVE",
          type: "PRODUCT",
          defaultUomId: "uom-1",
          taxProfileId: "tax-1",
          shelfLifeDays: null,
          requiresLotTracking: false,
          requiresExpiryDate: false,
          hsCode: null,
          metadata: null,
          categoryIds: [],
          variants: [
            {
              id: "variant-1",
              tenantId: "tenant-1",
              workspaceId: "workspace-1",
              itemId: "11111111-1111-1111-1111-111111111111",
              sku: "PHO-BO",
              name: "Pho Bo",
              status: "ACTIVE",
              attributes: null,
              barcodes: [
                {
                  id: "barcode-1",
                  barcode: "2000000000035",
                  createdAt: "2026-03-25T18:00:00.000Z",
                },
              ],
              createdAt: "2026-03-25T18:00:00.000Z",
              updatedAt: "2026-03-25T18:10:00.000Z",
              archivedAt: null,
            },
          ],
          createdAt: "2026-03-25T18:00:00.000Z",
          updatedAt: "2026-03-25T18:10:00.000Z",
          archivedAt: null,
        },
      ],
      total: 1,
    }),
    countActiveVariants: async () => 1,
    replaceItemCategoryIds: async () => undefined,
    findVariantById: async () => null,
    findVariantBySku: async () => null,
    upsertVariant: async () => undefined,
    replaceVariantBarcodes: async () => undefined,
    findUomByCode: async () => null,
    upsertUom: async () => undefined,
    listUoms: async () => ({ items: [], total: 0 }),
    findTaxProfileByName: async () => null,
    upsertTaxProfile: async () => undefined,
    listTaxProfiles: async () => ({ items: [], total: 0 }),
    findCategoryByName: async () => null,
    upsertCategory: async () => undefined,
    listCategories: async () => ({ items: [], total: 0 }),
    findPriceListByName: async () => null,
    upsertPriceList: async () => undefined,
    listPriceLists: async () => ({
      items: [
        {
          id: "price-list-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          name: "Restaurant POS",
          currency: "EUR",
          status: "ACTIVE",
          createdAt: "2026-03-25T18:00:00.000Z",
          updatedAt: "2026-03-25T18:00:00.000Z",
          archivedAt: null,
        },
      ],
      total: 1,
    }),
    upsertPrice: async () => undefined,
    listPrices: async () => ({
      items: [
        {
          id: "price-1",
          tenantId: "tenant-1",
          workspaceId: "workspace-1",
          priceListId: "price-list-1",
          itemId: "11111111-1111-1111-1111-111111111111",
          variantId: "variant-1",
          amount: 14.9,
          taxIncluded: true,
          effectiveFrom: null,
          effectiveTo: null,
          createdAt: "2026-03-25T18:00:00.000Z",
          updatedAt: "2026-03-25T18:00:00.000Z",
        },
      ],
      total: 1,
    }),
  };
}

describe("GetCatalogSnapshotUseCase", () => {
  it("returns active POS catalog products with prices and barcode", async () => {
    const useCase = new GetCatalogSnapshotUseCase(createCatalogRepo());

    const result = await useCase.execute(
      { limit: 50, offset: 0 },
      {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        userId: "user-1",
        requestId: "request-1",
        correlationId: "corr-1",
      }
    );

    expect("value" in result).toBe(true);
    if (!("value" in result)) {
      throw result.error;
    }

    expect(result.value.total).toBe(1);
    expect(result.value.products).toEqual([
      {
        productId: "11111111-1111-1111-1111-111111111111",
        sku: "PHO-BO",
        name: "Pho Bo",
        barcode: "2000000000035",
        priceCents: 1490,
        taxable: true,
        status: "ACTIVE",
        estimatedQty: null,
      },
    ]);
  });
});
