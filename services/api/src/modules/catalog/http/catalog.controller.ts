import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ArchiveCatalogItemInputSchema,
  ArchiveCatalogVariantInputSchema,
  CreateCatalogItemInputSchema,
  GetCatalogItemInputSchema,
  ListCatalogCategoriesInputSchema,
  ListCatalogItemsInputSchema,
  ListCatalogPriceListsInputSchema,
  ListCatalogPricesInputSchema,
  ListCatalogTaxProfilesInputSchema,
  ListCatalogUomsInputSchema,
  UpdateCatalogItemInputSchema,
  UpsertCatalogCategoryInputSchema,
  UpsertCatalogPriceInputSchema,
  UpsertCatalogPriceListInputSchema,
  UpsertCatalogTaxProfileInputSchema,
  UpsertCatalogUomInputSchema,
  UpsertCatalogVariantInputSchema,
} from "@corely/contracts";
import { parseListQuery } from "../../../shared/http/pagination";
import {
  buildUseCaseContext,
  mapResultToHttp,
  resolveIdempotencyKey,
} from "../../../shared/http/usecase-mappers";
import { AuthGuard } from "../../identity";
import { RbacGuard, RequirePermission } from "../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../platform";
import { ArchiveCatalogItemUseCase } from "../application/use-cases/archive-item.usecase";
import { ArchiveCatalogVariantUseCase } from "../application/use-cases/archive-variant.usecase";
import { CreateCatalogItemUseCase } from "../application/use-cases/create-item.usecase";
import { GetCatalogItemUseCase } from "../application/use-cases/get-item.usecase";
import { ListCatalogCategoriesUseCase } from "../application/use-cases/list-categories.usecase";
import { ListCatalogItemsUseCase } from "../application/use-cases/list-items.usecase";
import { ListCatalogPriceListsUseCase } from "../application/use-cases/list-price-lists.usecase";
import { ListCatalogPricesUseCase } from "../application/use-cases/list-prices.usecase";
import { ListCatalogTaxProfilesUseCase } from "../application/use-cases/list-tax-profiles.usecase";
import { ListCatalogUomsUseCase } from "../application/use-cases/list-uoms.usecase";
import { UpdateCatalogItemUseCase } from "../application/use-cases/update-item.usecase";
import { UpsertCatalogCategoryUseCase } from "../application/use-cases/upsert-category.usecase";
import { UpsertCatalogPriceUseCase } from "../application/use-cases/upsert-price.usecase";
import { UpsertCatalogPriceListUseCase } from "../application/use-cases/upsert-price-list.usecase";
import { UpsertCatalogTaxProfileUseCase } from "../application/use-cases/upsert-tax-profile.usecase";
import { UpsertCatalogUomUseCase } from "../application/use-cases/upsert-uom.usecase";
import { UpsertCatalogVariantUseCase } from "../application/use-cases/upsert-variant.usecase";

@Controller("catalog")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("catalog.basic")
export class CatalogController {
  constructor(
    private readonly createItem: CreateCatalogItemUseCase,
    private readonly updateItem: UpdateCatalogItemUseCase,
    private readonly archiveItem: ArchiveCatalogItemUseCase,
    private readonly getItem: GetCatalogItemUseCase,
    private readonly listItems: ListCatalogItemsUseCase,
    private readonly upsertVariant: UpsertCatalogVariantUseCase,
    private readonly archiveVariant: ArchiveCatalogVariantUseCase,
    private readonly upsertUom: UpsertCatalogUomUseCase,
    private readonly listUoms: ListCatalogUomsUseCase,
    private readonly upsertTaxProfile: UpsertCatalogTaxProfileUseCase,
    private readonly listTaxProfiles: ListCatalogTaxProfilesUseCase,
    private readonly upsertCategory: UpsertCatalogCategoryUseCase,
    private readonly listCategories: ListCatalogCategoriesUseCase,
    private readonly upsertPriceList: UpsertCatalogPriceListUseCase,
    private readonly listPriceLists: ListCatalogPriceListsUseCase,
    private readonly upsertPrice: UpsertCatalogPriceUseCase,
    private readonly listPrices: ListCatalogPricesUseCase
  ) {}

  @Get("items")
  @RequirePermission("catalog.read")
  async listCatalogItems(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 20 });
    const input = ListCatalogItemsInputSchema.parse({
      ...listQuery,
      status: typeof query.status === "string" ? query.status : undefined,
      type: typeof query.type === "string" ? query.type : undefined,
      taxProfileId: typeof query.taxProfileId === "string" ? query.taxProfileId : undefined,
      defaultUomId: typeof query.defaultUomId === "string" ? query.defaultUomId : undefined,
    });
    return mapResultToHttp(await this.listItems.execute(input, buildUseCaseContext(req as any)));
  }

  @Post("items")
  @RequirePermission("catalog.write")
  async createCatalogItem(@Body() body: unknown, @Req() req: Request) {
    const parsed = CreateCatalogItemInputSchema.parse(body);
    return mapResultToHttp(
      await this.createItem.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("items/:itemId")
  @RequirePermission("catalog.read")
  async getCatalogItem(@Param("itemId") itemId: string, @Req() req: Request) {
    return mapResultToHttp(
      await this.getItem.execute(
        GetCatalogItemInputSchema.parse({ itemId }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Patch("items/:itemId")
  @RequirePermission("catalog.write")
  async patchCatalogItem(
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    return mapResultToHttp(
      await this.updateItem.execute(
        UpdateCatalogItemInputSchema.parse({ itemId, ...(body as object) }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("items/:itemId/archive")
  @RequirePermission("catalog.write")
  async archiveCatalogItem(@Param("itemId") itemId: string, @Req() req: Request) {
    return mapResultToHttp(
      await this.archiveItem.execute(
        ArchiveCatalogItemInputSchema.parse({ itemId }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("items/:itemId/variants")
  @RequirePermission("catalog.write")
  async createCatalogVariant(
    @Param("itemId") itemId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const parsed = UpsertCatalogVariantInputSchema.parse({ ...(body as object), itemId });
    return mapResultToHttp(
      await this.upsertVariant.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Patch("variants/:variantId")
  @RequirePermission("catalog.write")
  async patchCatalogVariant(
    @Param("variantId") variantId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const parsed = UpsertCatalogVariantInputSchema.parse({ ...(body as object), variantId });
    return mapResultToHttp(
      await this.upsertVariant.execute(parsed, buildUseCaseContext(req as any))
    );
  }

  @Post("variants/:variantId/archive")
  @RequirePermission("catalog.write")
  async archiveCatalogVariant(@Param("variantId") variantId: string, @Req() req: Request) {
    return mapResultToHttp(
      await this.archiveVariant.execute(
        ArchiveCatalogVariantInputSchema.parse({ variantId }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("uoms")
  @RequirePermission("catalog.read")
  async listCatalogUoms(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 50 });
    return mapResultToHttp(
      await this.listUoms.execute(
        ListCatalogUomsInputSchema.parse(listQuery),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("uoms")
  @RequirePermission("catalog.write")
  async upsertCatalogUom(@Body() body: unknown, @Req() req: Request) {
    const parsed = UpsertCatalogUomInputSchema.parse(body);
    return mapResultToHttp(
      await this.upsertUom.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("tax-profiles")
  @RequirePermission("catalog.read")
  async listCatalogTaxProfiles(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 50 });
    return mapResultToHttp(
      await this.listTaxProfiles.execute(
        ListCatalogTaxProfilesInputSchema.parse(listQuery),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("tax-profiles")
  @RequirePermission("catalog.write")
  async upsertCatalogTaxProfile(@Body() body: unknown, @Req() req: Request) {
    const parsed = UpsertCatalogTaxProfileInputSchema.parse(body);
    return mapResultToHttp(
      await this.upsertTaxProfile.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("categories")
  @RequirePermission("catalog.read")
  async listCatalogCategories(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 50 });
    return mapResultToHttp(
      await this.listCategories.execute(
        ListCatalogCategoriesInputSchema.parse({
          ...listQuery,
          parentId: typeof query.parentId === "string" ? query.parentId : undefined,
        }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("categories")
  @RequirePermission("catalog.write")
  async upsertCatalogCategory(@Body() body: unknown, @Req() req: Request) {
    const parsed = UpsertCatalogCategoryInputSchema.parse(body);
    return mapResultToHttp(
      await this.upsertCategory.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("price-lists")
  @RequirePermission("catalog.read")
  async listCatalogPriceLists(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 50 });
    return mapResultToHttp(
      await this.listPriceLists.execute(
        ListCatalogPriceListsInputSchema.parse({
          ...listQuery,
          status: typeof query.status === "string" ? query.status : undefined,
        }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("price-lists")
  @RequirePermission("catalog.write")
  async upsertCatalogPriceList(@Body() body: unknown, @Req() req: Request) {
    const parsed = UpsertCatalogPriceListInputSchema.parse(body);
    return mapResultToHttp(
      await this.upsertPriceList.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }

  @Get("prices")
  @RequirePermission("catalog.read")
  async listCatalogPrices(@Query() query: Record<string, unknown>, @Req() req: Request) {
    const listQuery = parseListQuery(query, { defaultPageSize: 50 });
    return mapResultToHttp(
      await this.listPrices.execute(
        ListCatalogPricesInputSchema.parse({
          ...listQuery,
          priceListId: typeof query.priceListId === "string" ? query.priceListId : undefined,
          itemId: typeof query.itemId === "string" ? query.itemId : undefined,
          variantId: typeof query.variantId === "string" ? query.variantId : undefined,
        }),
        buildUseCaseContext(req as any)
      )
    );
  }

  @Post("prices")
  @RequirePermission("catalog.write")
  async upsertCatalogPrice(@Body() body: unknown, @Req() req: Request) {
    const parsed = UpsertCatalogPriceInputSchema.parse(body);
    return mapResultToHttp(
      await this.upsertPrice.execute(
        {
          ...parsed,
          idempotencyKey: resolveIdempotencyKey(req as any) ?? parsed.idempotencyKey,
        },
        buildUseCaseContext(req as any)
      )
    );
  }
}
