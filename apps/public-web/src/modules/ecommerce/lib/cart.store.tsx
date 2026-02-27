"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "corely.ecommerce.cart.v1";

export type CartLineItem = {
  catalogItemId: string;
  catalogVariantId: string;
  name: string;
  variantLabel: string;
  unitPrice: number;
  currency: string;
  qty: number;
};

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  currency: string | null;
  addItem: (item: CartLineItem) => void;
  updateQty: (catalogVariantId: string, qty: number) => void;
  removeItem: (catalogVariantId: string) => void;
  clear: () => void;
};

const isCartLineItem = (value: unknown): value is CartLineItem => {
  if (typeof value !== "object" || !value) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.catalogItemId === "string" &&
    typeof candidate.catalogVariantId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.variantLabel === "string" &&
    typeof candidate.unitPrice === "number" &&
    Number.isFinite(candidate.unitPrice) &&
    typeof candidate.currency === "string" &&
    typeof candidate.qty === "number" &&
    Number.isInteger(candidate.qty) &&
    candidate.qty > 0
  );
};

const readStoredCart = (): CartLineItem[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCartLineItem);
  } catch {
    return [];
  }
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);

  useEffect(() => {
    setItems(readStoredCart());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((count, item) => count + item.qty, 0);
    const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
    const currency = items[0]?.currency ?? null;

    return {
      items,
      itemCount,
      subtotal,
      currency,
      addItem: (item) => {
        setItems((current) => {
          const existingIndex = current.findIndex(
            (entry) => entry.catalogVariantId === item.catalogVariantId
          );

          if (existingIndex === -1) {
            return [...current, item];
          }

          return current.map((entry, index) =>
            index === existingIndex ? { ...entry, qty: entry.qty + item.qty } : entry
          );
        });
      },
      updateQty: (catalogVariantId, qty) => {
        setItems((current) =>
          current
            .map((entry) =>
              entry.catalogVariantId === catalogVariantId
                ? { ...entry, qty: Math.max(1, Math.floor(qty)) }
                : entry
            )
            .filter((entry) => entry.qty > 0)
        );
      },
      removeItem: (catalogVariantId) => {
        setItems((current) =>
          current.filter((entry) => entry.catalogVariantId !== catalogVariantId)
        );
      },
      clear: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCartContext = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCartContext must be used within CartProvider");
  }
  return context;
};
