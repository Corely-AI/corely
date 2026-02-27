"use client";

import { ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, EmptyState, Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { useCart } from "../hooks/use-cart";
import { ecommerceRoutes } from "../routes";
import { QuantityPicker } from "./quantity-picker";

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceSlug?: string | null;
};

export function CartDrawer({ open, onOpenChange, workspaceSlug }: CartDrawerProps) {
  const router = useRouter();
  const cart = useCart();

  const checkoutPath = ecommerceRoutes.checkout(workspaceSlug);
  const subtotalLabel =
    cart.currency && cart.items.length > 0
      ? formatMoney(cart.subtotal, cart.currency)
      : formatMoney(0, "USD");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Cart ({cart.itemCount})</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {cart.items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Your cart is empty"
              description="Add products from collections to continue to checkout."
            />
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.catalogVariantId}
                  className="rounded-lg border border-border/70 bg-card p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.variantLabel}</p>
                      <p className="text-sm font-semibold text-foreground">
                        {formatMoney(item.unitPrice, item.currency)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => cart.removeItem(item.catalogVariantId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3">
                    <QuantityPicker
                      value={item.qty}
                      onChange={(nextQty) => cart.updateQty(item.catalogVariantId, nextQty)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-semibold text-foreground">{subtotalLabel}</span>
          </div>
          <Button
            type="button"
            variant="accent"
            className="w-full"
            disabled={cart.items.length === 0}
            onClick={() => {
              onOpenChange(false);
              router.push(checkoutPath);
            }}
          >
            Checkout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
