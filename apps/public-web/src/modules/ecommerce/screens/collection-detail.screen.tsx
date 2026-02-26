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

type CollectionDetailScreenProps = {
  categoryIdOrSlug: string;
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

export function CollectionDetailScreen({
  categoryIdOrSlug,
  workspaceSlug,
}: CollectionDetailScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const sort = (searchParams.get("sort") as SortValue | null) ?? "featured";
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = 12;

  const categoriesQuery = useCatalogCategories({ page: 1, pageSize: 200, workspaceSlug });
  const itemsQuery = useCatalogItems({
    q: query || undefined,
    page: 1,
    pageSize: 500,
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

  useQueryErrorToast(itemsQuery.error, "Failed to load collection products");
  useQueryErrorToast(categoriesQuery.error, "Failed to load collection details");

  const category = (categoriesQuery.data?.items ?? []).find((candidate) => {
    if (candidate.id === categoryIdOrSlug) {
      return true;
    }
    return slugify(candidate.name) === categoryIdOrSlug;
  });

  const categoryItems = (itemsQuery.data?.items ?? []).filter((item) =>
    category ? item.categoryIds.includes(category.id) : false
  );

  const priceMap = buildItemPriceMap(categoryItems, pricesQuery.data?.items ?? [], activePriceList);
  const sortedItems = sortItems(categoryItems, sort, priceMap);

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const currentPage = Math.min(safePage, totalPages);
  const pageItems = sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const updateSearchParam = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ""}`);
  };

  if (categoriesQuery.isLoading || itemsQuery.isLoading || pricesQuery.isLoading) {
    return <ProductGridSkeleton count={12} />;
  }

  if (!category) {
    return (
      <EmptyState
        title="Collection not found"
        description="This collection does not exist or has not been published."
        action={
          <Button asChild variant="outline">
            <Link href={ecommerceRoutes.collections(workspaceSlug)}>Back to collections</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Link
          href={ecommerceRoutes.collections(workspaceSlug)}
          className="text-sm text-muted-foreground"
        >
          Collections
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{category.name}</h1>
        <p className="text-sm text-muted-foreground">
          {sortedItems.length} product(s) in this collection.
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
          <Input name="q" placeholder="Search collection" defaultValue={query} />
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

      <section>
        {pageItems.length === 0 ? (
          <EmptyState
            title="No products found"
            description="Try another search query in this collection."
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
          <ProductGrid items={pageItems} workspaceSlug={workspaceSlug} priceMap={priceMap} />
        )}
      </section>

      <section className="flex items-center justify-between border-t border-border/60 pt-4">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => updateSearchParam({ page: String(currentPage - 1) })}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={currentPage >= totalPages}
            onClick={() => updateSearchParam({ page: String(currentPage + 1) })}
          >
            Next
          </Button>
        </div>
      </section>
    </div>
  );
}
