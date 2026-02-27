"use client";

import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { useCart } from "../hooks/use-cart";
import { ecommerceRoutes } from "../routes";

type CheckoutScreenProps = {
  workspaceSlug?: string | null;
};

export function CheckoutScreen({ workspaceSlug }: CheckoutScreenProps) {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="No items to checkout"
        description="Add products to your cart before starting checkout."
        action={
          <Button asChild variant="outline">
            <Link href={ecommerceRoutes.collections(workspaceSlug)}>Browse collections</Link>
          </Button>
        }
      />
    );
  }

  const currency = cart.currency ?? "USD";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout (Sample)</h1>
        <p className="text-sm text-muted-foreground">
          This sample starts checkout with cart summary only. Payment and fulfillment integrations
          are intentionally out of scope.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cart.items.map((item) => (
              <div key={item.catalogVariantId} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                  <p className="text-xs text-muted-foreground">Qty {item.qty}</p>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {formatMoney(item.unitPrice * item.qty, item.currency)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Totals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatMoney(cart.subtotal, currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Shipping</span>
              <span>Calculated later</span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 font-semibold text-foreground">
              <span>Total</span>
              <span>{formatMoney(cart.subtotal, currency)}</span>
            </div>
            <Button type="button" className="w-full" disabled>
              Continue (Coming soon)
            </Button>
            <p className="text-xs text-muted-foreground">
              Payment provider integration is intentionally not included in this storefront sample.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
