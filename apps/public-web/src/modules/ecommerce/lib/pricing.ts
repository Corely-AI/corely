import type {
  CatalogItemDto,
  CatalogPriceDto,
  CatalogPriceListDto,
  CatalogVariantDto,
} from "@corely/contracts";

export type DisplayPrice = {
  amount: number;
  currency: string;
};

export const pickActivePriceList = (
  priceLists: CatalogPriceListDto[]
): CatalogPriceListDto | undefined =>
  priceLists.find((priceList) => priceList.status === "ACTIVE") ?? priceLists[0];

export const getVariantLabel = (variant: CatalogVariantDto): string =>
  variant.name?.trim() || variant.sku;

export const resolvePriceForItem = (params: {
  item: CatalogItemDto;
  prices: CatalogPriceDto[];
  priceList?: CatalogPriceListDto;
  variantId?: string | null;
}): DisplayPrice | null => {
  const { item, prices, priceList, variantId } = params;
  if (!priceList) {
    return null;
  }

  const filtered = prices.filter((price) => price.priceListId === priceList.id);

  if (variantId) {
    const variantPrice = filtered.find((price) => price.variantId === variantId);
    if (variantPrice) {
      return { amount: variantPrice.amount, currency: priceList.currency };
    }
  }

  const firstActiveVariant = item.variants.find((variant) => variant.status === "ACTIVE");
  if (firstActiveVariant) {
    const activeVariantPrice = filtered.find((price) => price.variantId === firstActiveVariant.id);
    if (activeVariantPrice) {
      return { amount: activeVariantPrice.amount, currency: priceList.currency };
    }
  }

  const itemPrice = filtered.find((price) => price.itemId === item.id);
  if (itemPrice) {
    return { amount: itemPrice.amount, currency: priceList.currency };
  }

  return null;
};

export const buildItemPriceMap = (
  items: CatalogItemDto[],
  prices: CatalogPriceDto[],
  priceList?: CatalogPriceListDto
): Record<string, DisplayPrice> =>
  items.reduce<Record<string, DisplayPrice>>((accumulator, item) => {
    const resolved = resolvePriceForItem({ item, prices, priceList });
    if (resolved) {
      accumulator[item.id] = resolved;
    }
    return accumulator;
  }, {});
