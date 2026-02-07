import type { PrismaService } from "@corely/data";
import type { CatalogPriceDto, CatalogPriceListDto } from "@corely/contracts";
import type {
  CatalogListParams,
  CatalogListResult,
  CatalogScope,
} from "../../application/ports/catalog-repository.port";
import { toCatalogPriceDto, toCatalogPriceListDto } from "./catalog-prisma.mappers";

export const findCatalogPriceListByName = async (
  prisma: PrismaService,
  scope: CatalogScope,
  name: string
): Promise<CatalogPriceListDto | null> => {
  const row = await prisma.catalogPriceList.findFirst({
    where: { tenantId: scope.tenantId, workspaceId: scope.workspaceId, name },
  });
  return row ? toCatalogPriceListDto(row) : null;
};

export const upsertCatalogPriceList = async (
  prisma: PrismaService,
  scope: CatalogScope,
  priceList: CatalogPriceListDto
): Promise<void> => {
  await prisma.catalogPriceList.upsert({
    where: { id: priceList.id },
    update: {
      name: priceList.name,
      currency: priceList.currency,
      status: priceList.status,
      archivedAt: priceList.archivedAt ? new Date(priceList.archivedAt) : null,
      updatedAt: new Date(priceList.updatedAt),
    },
    create: {
      id: priceList.id,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      name: priceList.name,
      currency: priceList.currency,
      status: priceList.status,
      archivedAt: priceList.archivedAt ? new Date(priceList.archivedAt) : undefined,
      createdAt: new Date(priceList.createdAt),
      updatedAt: new Date(priceList.updatedAt),
    },
  });
};

export const listCatalogPriceLists = async (
  prisma: PrismaService,
  scope: CatalogScope,
  params: CatalogListParams
): Promise<CatalogListResult<CatalogPriceListDto>> => {
  const where: any = { tenantId: scope.tenantId, workspaceId: scope.workspaceId };
  if (params.status) {
    where.status = params.status;
  }
  if (params.q) {
    where.name = { contains: params.q, mode: "insensitive" };
  }
  const [rows, total] = await Promise.all([
    prisma.catalogPriceList.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ name: "asc" }],
    }),
    prisma.catalogPriceList.count({ where }),
  ]);
  return { items: rows.map((row) => toCatalogPriceListDto(row)), total };
};

export const upsertCatalogPrice = async (
  prisma: PrismaService,
  scope: CatalogScope,
  price: CatalogPriceDto
): Promise<void> => {
  await prisma.catalogPrice.upsert({
    where: { id: price.id },
    update: {
      priceListId: price.priceListId,
      itemId: price.itemId ?? null,
      variantId: price.variantId ?? null,
      amount: price.amount,
      taxIncluded: price.taxIncluded,
      effectiveFrom: price.effectiveFrom ? new Date(price.effectiveFrom) : null,
      effectiveTo: price.effectiveTo ? new Date(price.effectiveTo) : null,
      updatedAt: new Date(price.updatedAt),
    },
    create: {
      id: price.id,
      tenantId: scope.tenantId,
      workspaceId: scope.workspaceId,
      priceListId: price.priceListId,
      itemId: price.itemId ?? undefined,
      variantId: price.variantId ?? undefined,
      amount: price.amount,
      taxIncluded: price.taxIncluded,
      effectiveFrom: price.effectiveFrom ? new Date(price.effectiveFrom) : undefined,
      effectiveTo: price.effectiveTo ? new Date(price.effectiveTo) : undefined,
      createdAt: new Date(price.createdAt),
      updatedAt: new Date(price.updatedAt),
    },
  });
};

export const listCatalogPrices = async (
  prisma: PrismaService,
  scope: CatalogScope,
  params: CatalogListParams
): Promise<CatalogListResult<CatalogPriceDto>> => {
  const where: any = {
    tenantId: scope.tenantId,
    workspaceId: scope.workspaceId,
  };
  if (params.priceListId) {
    where.priceListId = params.priceListId;
  }
  if (params.itemId) {
    where.itemId = params.itemId;
  }
  if (params.variantId) {
    where.variantId = params.variantId;
  }

  const [rows, total] = await Promise.all([
    prisma.catalogPrice.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.catalogPrice.count({ where }),
  ]);
  return { items: rows.map((row) => toCatalogPriceDto(row)), total };
};
