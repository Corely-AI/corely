import type { CatalogItemDto } from "@corely/contracts";
import { Skeleton } from "@/components/ui";
import { ProductCard } from "./product-card";
import type { DisplayPrice } from "../lib/pricing";

type ProductGridProps = {
  items: CatalogItemDto[];
  workspaceSlug?: string | null;
  priceMap?: Record<string, DisplayPrice>;
};

export function ProductGrid({ items, workspaceSlug, priceMap = {} }: ProductGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <ProductCard
          key={item.id}
          item={item}
          workspaceSlug={workspaceSlug}
          price={priceMap[item.id]}
        />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={`product-skeleton-${index}`} className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      ))}
    </div>
  );
}
