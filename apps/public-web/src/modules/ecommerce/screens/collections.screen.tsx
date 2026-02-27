"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  Button,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { CatalogItemDto } from "@corely/contracts";
import { ProductGrid, ProductGridSkeleton } from "../components/product-grid";
import { useCatalogCategories } from "../hooks/use-catalog-categories";
import { useCatalogItems } from "../hooks/use-catalog-items";
import { useCatalogPriceLists } from "../hooks/use-catalog-price-lists";
import { useCatalogPrices } from "../hooks/use-catalog-prices";
import { useQueryErrorToast } from "../hooks/use-query-error-toast";
import { slugify } from "../lib/image";
import { buildItemPriceMap, pickActivePriceList } from "../lib/pricing";
import { ecommerceRoutes } from "../routes";

type CollectionsScreenProps = {
  workspaceSlug?: string | null;
};

type SortValue = "featured" | "price-asc" | "price-desc" | "name-asc" | "name-desc";

const sortItems = (
  items: CatalogItemDto[],
  sort: SortValue,
  priceMap: Record<string, { amount: number; currency: string }>
): CatalogItemDto[] => {
  const sorted = [...items];

  if (sort === "name-asc") {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (sort === "name-desc") {
    return sorted.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (sort === "price-asc") {
    return sorted.sort((a, b) => {
      const left = priceMap[a.id]?.amount ?? Number.POSITIVE_INFINITY;
      const right = priceMap[b.id]?.amount ?? Number.POSITIVE_INFINITY;
      return left - right;
    });
  }

  if (sort === "price-desc") {
    return sorted.sort((a, b) => {
      const left = priceMap[a.id]?.amount ?? Number.NEGATIVE_INFINITY;
      const right = priceMap[b.id]?.amount ?? Number.NEGATIVE_INFINITY;
      return right - left;
    });
  }

  return sorted;
};

export function CollectionsScreen({ workspaceSlug }: CollectionsScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as SortValue | null) ?? "featured";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "12");

  const categoriesQuery = useCatalogCategories({
    page: 1,
    pageSize: 50,
    workspaceSlug,
  });

  const itemsQuery = useCatalogItems({
    q: query || undefined,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 12,
    workspaceSlug,
  });

  const priceListsQuery = useCatalogPriceLists({ page: 1, pageSize: 20, workspaceSlug });
  const activePriceList = pickActivePriceList(priceListsQuery.data?.items ?? []);

  const pricesQuery = useCatalogPrices(
    {
      page: 1,
      pageSize: 500,
      priceListId: activePriceList?.id,
      workspaceSlug,
    },
    Boolean(activePriceList)
  );

  useQueryErrorToast(itemsQuery.error, "Failed to load products");
  useQueryErrorToast(categoriesQuery.error, "Failed to load collections");

  const priceMap = buildItemPriceMap(
    itemsQuery.data?.items ?? [],
    pricesQuery.data?.items ?? [],
    activePriceList
  );

  const sortedItems = useMemo(
    () => sortItems(itemsQuery.data?.items ?? [], sort, priceMap),
    [itemsQuery.data?.items, priceMap, sort]
  );
  const pageInfo = itemsQuery.data?.pageInfo;

  const updateSearchParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  if (itemsQuery.isError) {
    return (
      <EmptyState
        title="Unable to load collections"
        description="Check your catalog connection and try again."
        action={
          <Button type="button" variant="outline" onClick={() => void itemsQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Explore products by collection, sort options, and search query.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-[1fr,220px]">
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const nextQuery = String(formData.get("q") ?? "").trim();
            updateSearchParam({ q: nextQuery || null, page: "1" });
          }}
        >
          <Input name="q" placeholder="Search products" defaultValue={query} />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        <Select
          value={sort}
          onValueChange={(value) => updateSearchParam({ sort: value, page: "1" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="featured">Featured</SelectItem>
            <SelectItem value="price-asc">Price: Low to high</SelectItem>
            <SelectItem value="price-desc">Price: High to low</SelectItem>
            <SelectItem value="name-asc">Name: A-Z</SelectItem>
            <SelectItem value="name-desc">Name: Z-A</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <section className="flex flex-wrap gap-2">
        {(categoriesQuery.data?.items ?? []).map((category) => (
          <Link
            key={category.id}
            href={ecommerceRoutes.collection(slugify(category.name), workspaceSlug)}
            className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {category.name}
          </Link>
        ))}
      </section>

      <section>
        {itemsQuery.isLoading ? (
          <ProductGridSkeleton count={12} />
        ) : sortedItems.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try another search term or clear your filters."
            action={
              <Button
                type="button"
                variant="outline"
                onClick={() => updateSearchParam({ q: null })}
              >
                Clear search
              </Button>
            }
          />
        ) : (
          <ProductGrid items={sortedItems} workspaceSlug={workspaceSlug} priceMap={priceMap} />
        )}
      </section>

      {pageInfo ? (
        <section className="flex items-center justify-between border-t border-border/60 pt-4">
          <p className="text-sm text-muted-foreground">
            Page {pageInfo.page} of {Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pageInfo.page <= 1}
              onClick={() => updateSearchParam({ page: String(pageInfo.page - 1) })}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!pageInfo.hasNextPage}
              onClick={() => updateSearchParam({ page: String(pageInfo.page + 1) })}
            >
              Next
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
