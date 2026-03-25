import {
  BaseUseCase,
  ConflictError,
  RequireTenant,
  ValidationError,
  ok,
  type Result,
  type UseCaseContext,
  type UseCaseError,
} from "@corely/kernel";
import type {
  CreatePosQuickCatalogItemInput,
  CreatePosQuickCatalogItemOutput,
} from "@corely/contracts";
import { normalizeCatalogCode, normalizeCatalogSku } from "../../domain/catalog-normalization";
import { scopeFromContext, type CatalogUseCaseDeps } from "./catalog.deps";

const DEFAULT_UOM_CODE = "PCS";
const DEFAULT_UOM_NAME = "Pieces";
const DEFAULT_PRICE_LIST_NAME = "POS Sell Prices";

@RequireTenant()
export class CreatePosQuickCatalogItemUseCase extends BaseUseCase<
  CreatePosQuickCatalogItemInput,
  CreatePosQuickCatalogItemOutput
> {
  constructor(private readonly depsRef: CatalogUseCaseDeps) {
    super({ logger: depsRef.logger });
  }

  protected async handle(
    input: CreatePosQuickCatalogItemInput,
    ctx: UseCaseContext
  ): Promise<Result<CreatePosQuickCatalogItemOutput, UseCaseError>> {
    const scope = scopeFromContext(ctx);
    const actionKey = "catalog.pos.quick-create-item";

    if (input.idempotencyKey) {
      const cached = await this.depsRef.idempotency.get(
        actionKey,
        scope.tenantId,
        input.idempotencyKey
      );
      if (cached?.body?.item && cached.body?.variant && cached.body?.price) {
        return ok(cached.body as CreatePosQuickCatalogItemOutput);
      }
    }

    const now = this.depsRef.clock.now().toISOString();
    const code = normalizeCatalogCode(input.code?.trim() || input.name);
    const sku = normalizeCatalogSku(input.sku?.trim() || code);

    const existingItem = await this.depsRef.repo.findItemByCode(scope, code);
    if (existingItem) {
      throw new ConflictError("Catalog item code already exists");
    }

    const existingVariant = await this.depsRef.repo.findVariantBySku(scope, sku);
    if (existingVariant) {
      throw new ConflictError("Catalog variant SKU already exists");
    }

    const defaultUom =
      (await this.depsRef.repo.findUomByCode(scope, DEFAULT_UOM_CODE)) ??
      (await this.ensureDefaultUom(scope, now));

    const priceList =
      (await this.findActivePriceList(scope)) ??
      (await this.ensureDefaultPriceList(scope, input.currency.trim().toUpperCase(), now));

    const categoryId = await this.resolveCategoryId(scope, input, now);
    const itemId = this.depsRef.idGenerator.newId();
    const variantId = this.depsRef.idGenerator.newId();
    const priceId = this.depsRef.idGenerator.newId();

    await this.depsRef.repo.createItem(scope, {
      id: itemId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      code,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      status: "ACTIVE",
      type: "PRODUCT",
      defaultUomId: defaultUom.id,
      taxProfileId: input.taxProfileId ?? null,
      shelfLifeDays: null,
      requiresLotTracking: false,
      requiresExpiryDate: false,
      hsCode: null,
      metadata: {
        createdFromSurface: "pos",
        creationMode: "quick",
        requiresBackofficeReview: true,
      },
      categoryIds: categoryId ? [categoryId] : [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });

    await this.depsRef.repo.replaceItemCategoryIds(scope, itemId, categoryId ? [categoryId] : []);

    const variant = {
      id: variantId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      itemId,
      sku,
      name: input.name.trim(),
      status: "ACTIVE" as const,
      attributes: null,
      barcodes: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };
    await this.depsRef.repo.upsertVariant(scope, variant);

    const barcode = input.barcode?.trim();
    if (barcode) {
      await this.depsRef.repo.replaceVariantBarcodes(scope, variantId, [barcode]);
    }

    const price = {
      id: priceId,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      priceListId: priceList.id,
      itemId,
      variantId,
      amount: input.amount,
      taxIncluded: true,
      effectiveFrom: null,
      effectiveTo: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.depsRef.repo.upsertPrice(scope, price);

    const item = await this.depsRef.repo.findItemById(scope, itemId);
    const freshVariant = await this.depsRef.repo.findVariantById(scope, variantId);
    if (!item || !freshVariant) {
      throw new ConflictError("Failed to load quick-created catalog item");
    }

    await this.depsRef.audit.log({
      tenantId: scope.tenantId,
      userId: ctx.userId ?? "system",
      action: "catalog.item.quick-created",
      entityType: "CatalogItem",
      entityId: item.id,
      metadata: {
        workspaceId: scope.workspaceId,
        surfaceId: ctx.surfaceId ?? null,
        priceListId: priceList.id,
      },
    });

    await this.depsRef.outbox.enqueue({
      tenantId: scope.tenantId,
      eventType: "catalog.item.quick-created",
      payload: {
        itemId: item.id,
        variantId: freshVariant.id,
        workspaceId: scope.workspaceId,
        surfaceId: ctx.surfaceId ?? null,
      },
      correlationId: ctx.correlationId,
    });

    const output: CreatePosQuickCatalogItemOutput = {
      item,
      variant: freshVariant,
      price,
      support: {
        priceListId: priceList.id,
        defaultUomId: defaultUom.id,
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

  private async ensureDefaultUom(scope: { tenantId: string; workspaceId: string }, now: string) {
    const existing = await this.depsRef.repo.findUomByCode(scope, DEFAULT_UOM_CODE);
    if (existing) {
      return existing;
    }

    const uom = {
      id: this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      code: DEFAULT_UOM_CODE,
      name: DEFAULT_UOM_NAME,
      baseCode: null,
      factor: null,
      rounding: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.depsRef.repo.upsertUom(scope, uom);
    return uom;
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
    currency: string,
    now: string
  ) {
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new ValidationError("currency must be a 3-letter ISO code");
    }

    const existing = await this.depsRef.repo.findPriceListByName(scope, DEFAULT_PRICE_LIST_NAME);
    if (existing) {
      return existing;
    }

    const priceList = {
      id: this.depsRef.idGenerator.newId(),
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: DEFAULT_PRICE_LIST_NAME,
      currency,
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
    input: CreatePosQuickCatalogItemInput,
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
