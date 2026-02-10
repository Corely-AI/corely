import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  CatalogCategoryDto,
  CatalogItemDto,
  CatalogPriceDto,
  CatalogPriceListDto,
  CatalogTaxProfileDto,
  CatalogUomDto,
  CatalogVariantDto,
} from "@corely/contracts";
import type {
  CatalogListParams,
  CatalogListResult,
  CatalogRepositoryPort,
  CatalogScope,
} from "../../application/ports/catalog-repository.port";
import {
  toCatalogCategoryDto,
  toCatalogItemDto,
  toCatalogPriceDto,
  toCatalogPriceListDto,
  toCatalogTaxProfileDto,
  toCatalogUomDto,
  toCatalogVariantDto,
} from "./catalog-prisma.mappers";
import {
  findCatalogPriceListByName,
  listCatalogPriceLists,
  listCatalogPrices,
  upsertCatalogPrice,
  upsertCatalogPriceList,
} from "./catalog-prisma-price-ops";

@Injectable()
export class PrismaCatalogRepositoryAdapter implements CatalogRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findItemById(scope: CatalogScope, itemId: string): Promise<CatalogItemDto | null> {
    const item = await this.prisma.catalogItem.findFirst({
      where: { id: itemId, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      include: {
        variants: { include: { barcodes: true }, orderBy: { createdAt: "asc" } },
        categories: true,
      },
    });
    return item ? toCatalogItemDto(item) : null;
  }

  async findItemByCode(scope: CatalogScope, code: string): Promise<CatalogItemDto | null> {
    const item = await this.prisma.catalogItem.findFirst({
      where: { code, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      include: {
        variants: { include: { barcodes: true }, orderBy: { createdAt: "asc" } },
        categories: true,
      },
    });
    return item ? toCatalogItemDto(item) : null;
  }

  async createItem(scope: CatalogScope, item: Omit<CatalogItemDto, "variants">): Promise<void> {
    await this.prisma.catalogItem.create({
      data: {
        id: item.id,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        code: item.code,
        name: item.name,
        description: item.description ?? undefined,
        status: item.status,
        type: item.type,
        defaultUomId: item.defaultUomId,
        taxProfileId: item.taxProfileId ?? undefined,
        shelfLifeDays: item.shelfLifeDays ?? undefined,
        requiresLotTracking: item.requiresLotTracking,
        requiresExpiryDate: item.requiresExpiryDate,
        hsCode: item.hsCode ?? undefined,
        metadata: (item.metadata ?? undefined) as any,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        archivedAt: item.archivedAt ? new Date(item.archivedAt) : undefined,
      },
    });
  }

  async updateItem(scope: CatalogScope, item: Omit<CatalogItemDto, "variants">): Promise<void> {
    await this.prisma.catalogItem.updateMany({
      where: { id: item.id, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      data: {
        code: item.code,
        name: item.name,
        description: item.description ?? null,
        status: item.status,
        type: item.type,
        defaultUomId: item.defaultUomId,
        taxProfileId: item.taxProfileId ?? null,
        shelfLifeDays: item.shelfLifeDays ?? null,
        requiresLotTracking: item.requiresLotTracking,
        requiresExpiryDate: item.requiresExpiryDate,
        hsCode: item.hsCode ?? null,
        metadata: (item.metadata ?? undefined) as any,
        updatedAt: new Date(item.updatedAt),
        archivedAt: item.archivedAt ? new Date(item.archivedAt) : null,
      },
    });
  }

  async listItems(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogItemDto>> {
    const where: any = {
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
    };
    if (params.q) {
      where.OR = [
        { code: { contains: params.q, mode: "insensitive" } },
        { name: { contains: params.q, mode: "insensitive" } },
      ];
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.type) {
      where.type = params.type;
    }

    const [rows, total] = await Promise.all([
      this.prisma.catalogItem.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        include: {
          variants: { include: { barcodes: true }, orderBy: { createdAt: "asc" } },
          categories: true,
        },
      }),
      this.prisma.catalogItem.count({ where }),
    ]);

    return { items: rows.map((row) => toCatalogItemDto(row)), total };
  }

  async countActiveVariants(scope: CatalogScope, itemId: string): Promise<number> {
    return this.prisma.catalogVariant.count({
      where: {
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        itemId,
        status: "ACTIVE",
      },
    });
  }

  async replaceItemCategoryIds(
    scope: CatalogScope,
    itemId: string,
    categoryIds: string[]
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.catalogItemCategory.deleteMany({ where: { itemId } }),
      ...(categoryIds.length
        ? [
            this.prisma.catalogItemCategory.createMany({
              data: categoryIds.map((categoryId) => ({ itemId, categoryId })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  async findVariantById(scope: CatalogScope, variantId: string): Promise<CatalogVariantDto | null> {
    const variant = await this.prisma.catalogVariant.findFirst({
      where: { id: variantId, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      include: { barcodes: { orderBy: { createdAt: "asc" } } },
    });
    return variant ? toCatalogVariantDto(variant) : null;
  }

  async findVariantBySku(scope: CatalogScope, sku: string): Promise<CatalogVariantDto | null> {
    const variant = await this.prisma.catalogVariant.findFirst({
      where: { sku, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      include: { barcodes: { orderBy: { createdAt: "asc" } } },
    });
    return variant ? toCatalogVariantDto(variant) : null;
  }

  async upsertVariant(scope: CatalogScope, variant: CatalogVariantDto): Promise<void> {
    await this.prisma.catalogVariant.upsert({
      where: { id: variant.id },
      update: {
        itemId: variant.itemId,
        sku: variant.sku,
        name: variant.name ?? null,
        status: variant.status,
        attributes: (variant.attributes ?? undefined) as any,
        updatedAt: new Date(variant.updatedAt),
        archivedAt: variant.archivedAt ? new Date(variant.archivedAt) : null,
      },
      create: {
        id: variant.id,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        itemId: variant.itemId,
        sku: variant.sku,
        name: variant.name ?? undefined,
        status: variant.status,
        attributes: (variant.attributes ?? undefined) as any,
        createdAt: new Date(variant.createdAt),
        updatedAt: new Date(variant.updatedAt),
        archivedAt: variant.archivedAt ? new Date(variant.archivedAt) : undefined,
      },
    });
  }

  async replaceVariantBarcodes(
    scope: CatalogScope,
    variantId: string,
    barcodes: string[]
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.catalogVariantBarcode.deleteMany({
        where: { variantId, tenantId: scope.tenantId, workspaceId: scope.workspaceId },
      }),
      ...(barcodes.length
        ? [
            this.prisma.catalogVariantBarcode.createMany({
              data: barcodes.map((barcode) => ({
                id: `${variantId}-${barcode}`,
                tenantId: scope.tenantId,
                workspaceId: scope.workspaceId,
                variantId,
                barcode,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  async findUomByCode(scope: CatalogScope, code: string): Promise<CatalogUomDto | null> {
    const row = await this.prisma.catalogUom.findFirst({
      where: { tenantId: scope.tenantId, workspaceId: scope.workspaceId, code },
    });
    return row ? toCatalogUomDto(row) : null;
  }

  async upsertUom(scope: CatalogScope, uom: CatalogUomDto): Promise<void> {
    await this.prisma.catalogUom.upsert({
      where: { id: uom.id },
      update: {
        code: uom.code,
        name: uom.name,
        baseCode: uom.baseCode ?? null,
        factor: uom.factor ?? null,
        rounding: uom.rounding ?? null,
        updatedAt: new Date(uom.updatedAt),
      },
      create: {
        id: uom.id,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        code: uom.code,
        name: uom.name,
        baseCode: uom.baseCode ?? undefined,
        factor: uom.factor ?? undefined,
        rounding: uom.rounding ?? undefined,
        createdAt: new Date(uom.createdAt),
        updatedAt: new Date(uom.updatedAt),
      },
    });
  }

  async listUoms(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogUomDto>> {
    const where: any = { tenantId: scope.tenantId, workspaceId: scope.workspaceId };
    if (params.q) {
      where.OR = [
        { code: { contains: params.q, mode: "insensitive" } },
        { name: { contains: params.q, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.catalogUom.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: [{ code: "asc" }],
      }),
      this.prisma.catalogUom.count({ where }),
    ]);
    return { items: rows.map((row) => toCatalogUomDto(row)), total };
  }

  async findTaxProfileByName(
    scope: CatalogScope,
    name: string
  ): Promise<CatalogTaxProfileDto | null> {
    const row = await this.prisma.catalogTaxProfile.findFirst({
      where: { tenantId: scope.tenantId, workspaceId: scope.workspaceId, name },
    });
    return row ? toCatalogTaxProfileDto(row) : null;
  }

  async upsertTaxProfile(scope: CatalogScope, taxProfile: CatalogTaxProfileDto): Promise<void> {
    await this.prisma.catalogTaxProfile.upsert({
      where: { id: taxProfile.id },
      update: {
        name: taxProfile.name,
        vatRateBps: taxProfile.vatRateBps,
        isExciseApplicable: taxProfile.isExciseApplicable,
        exciseType: taxProfile.exciseType ?? null,
        exciseValue: taxProfile.exciseValue ?? null,
        effectiveFrom: taxProfile.effectiveFrom ? new Date(taxProfile.effectiveFrom) : null,
        effectiveTo: taxProfile.effectiveTo ? new Date(taxProfile.effectiveTo) : null,
        archivedAt: taxProfile.archivedAt ? new Date(taxProfile.archivedAt) : null,
        updatedAt: new Date(taxProfile.updatedAt),
      },
      create: {
        id: taxProfile.id,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        name: taxProfile.name,
        vatRateBps: taxProfile.vatRateBps,
        isExciseApplicable: taxProfile.isExciseApplicable,
        exciseType: taxProfile.exciseType ?? undefined,
        exciseValue: taxProfile.exciseValue ?? undefined,
        effectiveFrom: taxProfile.effectiveFrom ? new Date(taxProfile.effectiveFrom) : undefined,
        effectiveTo: taxProfile.effectiveTo ? new Date(taxProfile.effectiveTo) : undefined,
        archivedAt: taxProfile.archivedAt ? new Date(taxProfile.archivedAt) : undefined,
        createdAt: new Date(taxProfile.createdAt),
        updatedAt: new Date(taxProfile.updatedAt),
      },
    });
  }

  async listTaxProfiles(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogTaxProfileDto>> {
    const where: any = { tenantId: scope.tenantId, workspaceId: scope.workspaceId };
    if (params.q) {
      where.name = { contains: params.q, mode: "insensitive" };
    }
    const [rows, total] = await Promise.all([
      this.prisma.catalogTaxProfile.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.catalogTaxProfile.count({ where }),
    ]);
    return { items: rows.map((row) => toCatalogTaxProfileDto(row)), total };
  }

  async findCategoryByName(scope: CatalogScope, name: string): Promise<CatalogCategoryDto | null> {
    const row = await this.prisma.catalogCategory.findFirst({
      where: { tenantId: scope.tenantId, workspaceId: scope.workspaceId, name },
    });
    return row ? toCatalogCategoryDto(row) : null;
  }

  async upsertCategory(scope: CatalogScope, category: CatalogCategoryDto): Promise<void> {
    await this.prisma.catalogCategory.upsert({
      where: { id: category.id },
      update: {
        name: category.name,
        parentId: category.parentId ?? null,
        archivedAt: category.archivedAt ? new Date(category.archivedAt) : null,
        updatedAt: new Date(category.updatedAt),
      },
      create: {
        id: category.id,
        tenantId: scope.tenantId,
        workspaceId: scope.workspaceId,
        name: category.name,
        parentId: category.parentId ?? undefined,
        archivedAt: category.archivedAt ? new Date(category.archivedAt) : undefined,
        createdAt: new Date(category.createdAt),
        updatedAt: new Date(category.updatedAt),
      },
    });
  }

  async listCategories(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogCategoryDto>> {
    const where: any = { tenantId: scope.tenantId, workspaceId: scope.workspaceId };
    if (params.parentId !== undefined) {
      where.parentId = params.parentId;
    }
    if (params.q) {
      where.name = { contains: params.q, mode: "insensitive" };
    }
    const [rows, total] = await Promise.all([
      this.prisma.catalogCategory.findMany({
        where,
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        orderBy: [{ name: "asc" }],
      }),
      this.prisma.catalogCategory.count({ where }),
    ]);
    return { items: rows.map((row) => toCatalogCategoryDto(row)), total };
  }

  async findPriceListByName(
    scope: CatalogScope,
    name: string
  ): Promise<CatalogPriceListDto | null> {
    return findCatalogPriceListByName(this.prisma, scope, name);
  }

  async upsertPriceList(scope: CatalogScope, priceList: CatalogPriceListDto): Promise<void> {
    await upsertCatalogPriceList(this.prisma, scope, priceList);
  }

  async listPriceLists(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogPriceListDto>> {
    return listCatalogPriceLists(this.prisma, scope, params);
  }

  async upsertPrice(scope: CatalogScope, price: CatalogPriceDto): Promise<void> {
    await upsertCatalogPrice(this.prisma, scope, price);
  }

  async listPrices(
    scope: CatalogScope,
    params: CatalogListParams
  ): Promise<CatalogListResult<CatalogPriceDto>> {
    return listCatalogPrices(this.prisma, scope, params);
  }
}
