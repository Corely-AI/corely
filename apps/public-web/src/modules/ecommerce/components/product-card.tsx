import Link from "next/link";
import type { CatalogItemDto } from "@corely/contracts";
import { Card, CardContent } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { catalogImagePlaceholder } from "../lib/image";
import { ecommerceRoutes } from "../routes";

type ProductCardProps = {
  item: CatalogItemDto;
  workspaceSlug?: string | null;
  price?: {
    amount: number;
    currency: string;
  };
};

export function ProductCard({ item, workspaceSlug, price }: ProductCardProps) {
  const imageUrl = catalogImagePlaceholder(item.id);

  return (
    <Link href={ecommerceRoutes.product(item.id, workspaceSlug)}>
      <Card className="group h-full overflow-hidden border-border/70 transition-transform duration-200 hover:-translate-y-1">
        <div className="aspect-square overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
        <CardContent className="space-y-2 p-4">
          <h3 className="line-clamp-1 text-base font-semibold text-foreground">{item.name}</h3>
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
            {item.description?.trim() || "Premium catalog item ready for checkout."}
          </p>
          <p className="text-sm font-semibold text-foreground">
            {price ? formatMoney(price.amount, price.currency) : "Price unavailable"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
