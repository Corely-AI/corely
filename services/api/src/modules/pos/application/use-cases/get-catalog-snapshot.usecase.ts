import { Inject, Injectable } from "@nestjs/common";
import type { GetCatalogSnapshotInput, GetCatalogSnapshotOutput } from "@corely/contracts";
import {
  BaseUseCase,
  NoopLogger,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
  RequireTenant,
} from "@corely/kernel";
import {
  CATALOG_REPOSITORY,
  type CatalogRepositoryPort,
  type CatalogScope,
} from "@/modules/catalog/application/ports/catalog-repository.port";

@RequireTenant()
@Injectable()
export class GetCatalogSnapshotUseCase extends BaseUseCase<
  GetCatalogSnapshotInput,
  GetCatalogSnapshotOutput
> {
  constructor(@Inject(CATALOG_REPOSITORY) private readonly catalogRepo: CatalogRepositoryPort) {
    super({ logger: new NoopLogger() });
  }

  protected async handle(
    input: GetCatalogSnapshotInput,
    ctx: UseCaseContext
  ): Promise<Result<GetCatalogSnapshotOutput, UseCaseError>> {
    const limit = Number(input.limit ?? 500);
    const offset = Number(input.offset ?? 0);
    const platformTenantId =
      typeof ctx.metadata?.platformTenantId === "string" ? ctx.metadata.platformTenantId : null;
    const scope: CatalogScope = {
      tenantId: platformTenantId ?? ctx.tenantId!,
      workspaceId: ctx.workspaceId ?? ctx.tenantId!,
    };
    const page = Math.floor(offset / limit) + 1;
    const itemsResult = await this.catalogRepo.listItems(scope, {
      page,
      pageSize: limit,
      status: "ACTIVE",
      type: "PRODUCT",
    });
    const priceListResult = await this.catalogRepo.listPriceLists(scope, {
      page: 1,
      pageSize: 50,
      status: "ACTIVE",
    });
    const activePriceList =
      priceListResult.items.find((priceList) => /pos/i.test(priceList.name)) ??
      priceListResult.items[0] ??
      null;
    const priceResult = activePriceList
      ? await this.catalogRepo.listPrices(scope, {
          page: 1,
          pageSize: Math.max(input.limit * 4, 500),
          priceListId: activePriceList.id,
        })
      : { items: [], total: 0 };
    const pricesByVariantId = new Map(
      priceResult.items
        .filter((price) => price.variantId)
        .map((price) => [price.variantId as string, price])
    );
    const pricesByItemId = new Map(
      priceResult.items
        .filter((price) => price.itemId)
        .map((price) => [price.itemId as string, price])
    );

    const products = itemsResult.items
      .filter((item) => {
        if (!input.updatedSince) {
          return true;
        }
        return new Date(item.updatedAt) > input.updatedSince;
      })
      .map((item) => {
        const variant =
          item.variants.find((candidate) => candidate.status === "ACTIVE") ??
          item.variants[0] ??
          null;
        const price =
          (variant ? pricesByVariantId.get(variant.id) : undefined) ?? pricesByItemId.get(item.id);

        return {
          productId: item.id,
          sku: variant?.sku ?? item.code,
          name: item.name,
          barcode: variant?.barcodes[0]?.barcode ?? null,
          priceCents: price ? Math.round(price.amount * 100) : 0,
          taxable: Boolean(item.taxProfileId),
          status: item.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
          estimatedQty: null,
        } as const;
      });

    return ok({
      products,
      hasMore: offset + itemsResult.items.length < itemsResult.total,
      total: itemsResult.total,
    });
  }
}
