import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  RequireTenant,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import type {
  UpdatePosQuickCatalogItemInput,
  UpdatePosQuickCatalogItemOutput,
} from "@corely/contracts";
import { normalizeCatalogSku } from "../../domain/catalog-normalization";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

const DEFAULT_PRICE_LIST_NAME = "POS Sell Prices";

@RequireTenant()
export class UpdatePosQuickCatalogItemUseCase extends BaseUseCase<
  UpdatePosQuickCatalogItemInput,
  UpdatePosQuickCatalogItemOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: UpdatePosQuickCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdatePosQuickCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const actionKey = "catalog.pos.quick-update-item";

    if (input.idempotencyKey) {
      const cached = await this.depsRef.idempotency.get(
        actionKey,
        scope.tenantId,
        input.idempotencyKey
      );
      if (cached?.body?.item && cached.body?.variant && cached.body?.price) {
        return ok(cached.body as UpdatePosQuickCatalogItemOutput);
      }
    }

    const current = await this.depsRef.repo.findItemById(scope, input.itemId);
    if (!current) {
      throw new NotFoundError("Catalog item not found");
    }

    const now = this.depsRef.clock.now().toISOString();
    const categoryId = await this.resolveCategoryId(scope, input, now);
    const { variants: _variants, ...currentItem } = current;

    await this.depsRef.repo.updateItem(scope, {
      ...currentItem,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      taxProfileId: input.taxProfileId ?? null,
      categoryIds: categoryId ? [categoryId] : [],
      updatedAt: now,
    });
    await this.depsRef.repo.replaceItemCategoryIds(
      scope,
      current.id,
      categoryId ? [categoryId] : []
    );

    const existingVariant = current.variants[0] ?? null;
    const nextSku = normalizeCatalogSku(input.sku?.trim() || existingVariant?.sku || current.code);
    const variantBySku = await this.depsRef.repo.findVariantBySku(scope, nextSku);
    if (variantBySku && variantBySku.id !== existingVariant?.id) {
      throw new ConflictError("Catalog variant SKU already exists");
    }

    const variantId = existingVariant?.id ?? this.depsRef.idGenerator.newId();
    await this.depsRef.repo.upsertVariant(scope, {
      id: variantId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      itemId: current.id,
      sku: nextSku,
      name: input.name.trim(),
      status: existingVariant?.status ?? "ACTIVE",
      attributes: existingVariant?.attributes ?? null,
      barcodes: existingVariant?.barcodes ?? [],
      createdAt: existingVariant?.createdAt ?? now,
      updatedAt: now,
      archivedAt: existingVariant?.archivedAt ?? null,
    });

    const barcode = input.barcode?.trim();
    await this.depsRef.repo.replaceVariantBarcodes(scope, variantId, barcode ? [barcode] : []);

    const existingPrice = await this.findCurrentPrice(scope, current.id, variantId);
    const priceListId =
      existingPrice?.priceListId ??
      (await this.findActivePriceList(scope))?.id ??
      (await this.ensureDefaultPriceList(scope, now)).id;

    const price = {
      id: existingPrice?.id ?? this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      priceListId,
      itemId: current.id,
      variantId,
      amount: input.amount,
      taxIncluded: existingPrice?.taxIncluded ?? true,
      effectiveFrom: existingPrice?.effectiveFrom ?? null,
      effectiveTo: existingPrice?.effectiveTo ?? null,
      createdAt: existingPrice?.createdAt ?? now,
      updatedAt: now,
    };
    await this.depsRef.repo.upsertPrice(scope, price);

    const item = await this.depsRef.repo.findItemById(scope, current.id);
    const variant = await this.depsRef.repo.findVariantById(scope, variantId);
    if (!item || !variant) {
      throw new NotFoundError("Catalog item not found");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.item.quick-updated",
      entityType: "CatalogItem",
      entityId: item.id,
      metadata: {
        workspaceId: scope.workspaceId,
        surfaceId: ctx.surfaceId ?? null,
        priceListId,
      },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.item.quick-updated",
      payload: {
        itemId: item.id,
        variantId: variant.id,
        workspaceId: scope.workspaceId,
        surfaceId: ctx.surfaceId ?? null,
      },
      correlationId: ctx.correlationId,
    });

    const output: UpdatePosQuickCatalogItemOutput = {
      item,
      variant,
      price,
      support: {
        priceListId,
        categoryId,
      },
    };

    if (input.idempotencyKey) {
      await this.depsRef.idempotency.store(actionKey, scope.tenantId, input.idempotencyKey, {
        body: output,
      });
    }

    return ok(output);
  }

  private async findCurrentPrice(
    scope: { tenantId: string; workspaceId: string },
    itemId: string,
    variantId: string
  ) {
    const byVariant = await this.depsRef.repo.listPrices(scope, {
      page: 1,
      pageSize: 1,
      variantId,
    });
    if (byVariant.items[0]) {
      return byVariant.items[0];
    }

    const byItem = await this.depsRef.repo.listPrices(scope, {
      page: 1,
      pageSize: 1,
      itemId,
    });
    return byItem.items[0] ?? null;
  }

  private async findActivePriceList(scope: { tenantId: string; workspaceId: string }) {
    const result = await this.depsRef.repo.listPriceLists(scope, {
      page: 1,
      pageSize: 1,
      status: "ACTIVE",
    });
    return result.items[0] ?? null;
  }

  private async ensureDefaultPriceList(
    scope: { tenantId: string; workspaceId: string },
    now: string
  ) {
    const existing = await this.depsRef.repo.findPriceListByName(scope, DEFAULT_PRICE_LIST_NAME);
    if (existing) {
      return existing;
    }

    const priceList = {
      id: this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: DEFAULT_PRICE_LIST_NAME,
      currency: "EUR",
      status: "ACTIVE" as const,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await this.depsRef.repo.upsertPriceList(scope, priceList);
    return priceList;
  }

  private async resolveCategoryId(
    scope: { tenantId: string; workspaceId: string },
    input: UpdatePosQuickCatalogItemInput,
    now: string
  ) {
    if (input.categoryId) {
      return input.categoryId;
    }

    const categoryName = input.categoryName?.trim();
    if (!categoryName) {
      return null;
    }

    const existing = await this.depsRef.repo.findCategoryByName(scope, categoryName);
    if (existing) {
      return existing.id;
    }

    const category = {
      id: this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: categoryName,
      parentId: null,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await this.depsRef.repo.upsertCategory(scope, category);
    return category.id;
  }
}
