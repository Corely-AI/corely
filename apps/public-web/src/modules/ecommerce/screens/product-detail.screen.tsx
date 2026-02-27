"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  EmptyState,
  Skeleton,
  sonnerToast,
} from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { catalogImagePlaceholder } from "../lib/image";
import { getVariantLabel, pickActivePriceList, resolvePriceForItem } from "../lib/pricing";
import { ecommerceRoutes } from "../routes";
import { useCatalogItem } from "../hooks/use-catalog-item";
import { useCatalogPriceLists } from "../hooks/use-catalog-price-lists";
import { useCatalogPrices } from "../hooks/use-catalog-prices";
import { useQueryErrorToast } from "../hooks/use-query-error-toast";
import { QuantityPicker } from "../components/quantity-picker";
import { VariantSelector } from "../components/variant-selector";
import { useCart } from "../hooks/use-cart";

type ProductDetailScreenProps = {
  itemId: string;
  workspaceSlug?: string | null;
};

export function ProductDetailScreen({ itemId, workspaceSlug }: ProductDetailScreenProps) {
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const itemQuery = useCatalogItem(itemId, { workspaceSlug });
  const priceListsQuery = useCatalogPriceLists({ page: 1, pageSize: 20, workspaceSlug });
  const activePriceList = pickActivePriceList(priceListsQuery.data?.items ?? []);
  const selectedVariantForQuery =
    itemQuery.data?.variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const itemPricesQuery = useCatalogPrices(
    {
      page: 1,
      pageSize: 50,
      priceListId: activePriceList?.id,
      itemId,
      workspaceSlug,
    },
    Boolean(activePriceList)
  );

  const variantPricesQuery = useCatalogPrices(
    {
      page: 1,
      pageSize: 50,
      priceListId: activePriceList?.id,
      variantId: selectedVariantForQuery?.id ?? undefined,
      workspaceSlug,
    },
    Boolean(activePriceList && selectedVariantForQuery?.id)
  );

  useQueryErrorToast(itemQuery.error, "Failed to load product details");
  useQueryErrorToast(itemPricesQuery.error, "Failed to load product pricing");

  useEffect(() => {
    const item = itemQuery.data;
    if (!item) {
      return;
    }

    const firstActiveVariant = item.variants.find((variant) => variant.status === "ACTIVE");
    setSelectedVariantId(firstActiveVariant?.id ?? item.variants[0]?.id ?? item.id);
  }, [itemQuery.data]);

  const item = itemQuery.data;
  const selectedVariant =
    item?.variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const resolvedPrice = useMemo(() => {
    if (!item) {
      return null;
    }

    return resolvePriceForItem({
      item,
      priceList: activePriceList,
      prices: [...(variantPricesQuery.data?.items ?? []), ...(itemPricesQuery.data?.items ?? [])],
      variantId: selectedVariant?.id ?? null,
    });
  }, [
    item,
    activePriceList,
    itemPricesQuery.data?.items,
    selectedVariant?.id,
    variantPricesQuery.data?.items,
  ]);

  const isBusy = itemQuery.isLoading || priceListsQuery.isLoading || itemPricesQuery.isLoading;

  if (itemQuery.isError) {
    return (
      <EmptyState
        title="Product unavailable"
        description="We couldn't load this product right now."
        action={
          <Button type="button" variant="outline" onClick={() => void itemQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (isBusy || !item) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-4">
        <Link
          href={ecommerceRoutes.collections(workspaceSlug)}
          className="text-sm text-muted-foreground"
        >
          Back to collections
        </Link>
        <div className="aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted">
          <img
            src={catalogImagePlaceholder(item.id)}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      </section>

      <section className="space-y-5">
        <Badge variant="secondary">Product</Badge>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{item.name}</h1>
        <p className="text-lg font-semibold text-foreground">
          {resolvedPrice
            ? formatMoney(resolvedPrice.amount, resolvedPrice.currency)
            : "Price unavailable"}
        </p>

        <p className="text-sm text-muted-foreground">
          {item.description?.trim() ||
            "This is a sample storefront description. Connect catalog metadata to render richer product details."}
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Variant</p>
          <VariantSelector
            variants={item.variants}
            selectedVariantId={selectedVariantId}
            onSelect={setSelectedVariantId}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Quantity</p>
          <QuantityPicker value={qty} onChange={setQty} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="accent"
            disabled={!resolvedPrice}
            onClick={() => {
              if (!resolvedPrice) {
                sonnerToast.error("This product cannot be purchased yet");
                return;
              }

              cart.addItem({
                catalogItemId: item.id,
                catalogVariantId: selectedVariant?.id ?? item.id,
                name: item.name,
                variantLabel: selectedVariant ? getVariantLabel(selectedVariant) : "Default option",
                unitPrice: resolvedPrice.amount,
                currency: resolvedPrice.currency,
                qty,
              });
              sonnerToast.success("Added to cart", {
                description: `${item.name} (${qty}) added successfully.`,
              });
            }}
          >
            Add to cart
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={ecommerceRoutes.checkout(workspaceSlug)}>Go to checkout</Link>
          </Button>
        </div>

        <Accordion type="single" collapsible defaultValue="details">
          <AccordionItem value="details">
            <AccordionTrigger>Product details</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                SKU {selectedVariant?.sku ?? "N/A"}. Shipping and tax are calculated during
                checkout.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger>Shipping</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Sample storefront uses a placeholder shipping profile. Connect logistics providers
                for live rates.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="returns">
            <AccordionTrigger>Returns</AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">
                Returns accepted within 30 days for unopened products. Final policy depends on
                workspace settings.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
