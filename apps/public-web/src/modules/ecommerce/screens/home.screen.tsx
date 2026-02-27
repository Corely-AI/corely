"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge, Button, EmptyState, Skeleton } from "@/components/ui";
import { useCatalogCategories } from "../hooks/use-catalog-categories";
import { useCatalogItems } from "../hooks/use-catalog-items";
import { useCatalogPriceLists } from "../hooks/use-catalog-price-lists";
import { useCatalogPrices } from "../hooks/use-catalog-prices";
import { useQueryErrorToast } from "../hooks/use-query-error-toast";
import { buildItemPriceMap, pickActivePriceList } from "../lib/pricing";
import { ProductGrid, ProductGridSkeleton } from "../components/product-grid";
import { ecommerceRoutes } from "../routes";
import { slugify } from "../lib/image";

type EcommerceHomeScreenProps = {
  workspaceSlug?: string | null;
};

export function EcommerceHomeScreen({ workspaceSlug }: EcommerceHomeScreenProps) {
  const categoriesQuery = useCatalogCategories({ page: 1, pageSize: 8, workspaceSlug });
  const itemsQuery = useCatalogItems({ page: 1, pageSize: 8, workspaceSlug });
  const priceListsQuery = useCatalogPriceLists({ page: 1, pageSize: 20, workspaceSlug });

  const activePriceList = pickActivePriceList(priceListsQuery.data?.items ?? []);

  const pricesQuery = useCatalogPrices(
    {
      page: 1,
      pageSize: 300,
      priceListId: activePriceList?.id,
      workspaceSlug,
    },
    Boolean(activePriceList)
  );

  useQueryErrorToast(categoriesQuery.error, "Failed to load collections");
  useQueryErrorToast(itemsQuery.error, "Failed to load featured products");
  useQueryErrorToast(pricesQuery.error, "Failed to load prices");

  const featuredCollections = (categoriesQuery.data?.items ?? []).slice(0, 4);
  const featuredItems = itemsQuery.data?.items ?? [];
  const priceMap = buildItemPriceMap(featuredItems, pricesQuery.data?.items ?? [], activePriceList);

  const hasBlockingError = categoriesQuery.isError || itemsQuery.isError;
  const isLoading =
    categoriesQuery.isLoading ||
    itemsQuery.isLoading ||
    priceListsQuery.isLoading ||
    pricesQuery.isLoading;

  if (hasBlockingError) {
    return (
      <EmptyState
        title="Storefront unavailable"
        description="We couldn't load the catalog right now. Try refreshing the page."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void categoriesQuery.refetch();
              void itemsQuery.refetch();
            }}
          >
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-border/60 bg-card p-6 sm:p-10">
        <div className="space-y-4">
          <Badge variant="secondary">Shopify-style sample storefront</Badge>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Discover curated collections from Corely Catalog
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Browse collections, compare variants, add products to cart, and start checkout.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <Link href={ecommerceRoutes.collections(workspaceSlug)}>Shop now</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={ecommerceRoutes.checkout(workspaceSlug)}>Go to checkout</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Featured collections</h2>
          <Button asChild size="sm" variant="ghost">
            <Link href={ecommerceRoutes.collections(workspaceSlug)}>
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={`collection-skeleton-${index}`} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : featuredCollections.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Catalog categories will appear here once configured."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCollections.map((category) => (
              <Link
                key={category.id}
                href={ecommerceRoutes.collection(slugify(category.name), workspaceSlug)}
                className="rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-accent"
              >
                <p className="font-medium text-foreground">{category.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">Explore products</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Featured products</h2>
        {isLoading ? (
          <ProductGridSkeleton count={8} />
        ) : featuredItems.length === 0 ? (
          <EmptyState
            title="No products yet"
            description="Add items in Catalog to populate this storefront."
          />
        ) : (
          <ProductGrid items={featuredItems} workspaceSlug={workspaceSlug} priceMap={priceMap} />
        )}
      </section>
    </div>
  );
}
