import { create } from "zustand";
import { v4 as uuidv4 } from "@lukeed/uuid";
import type { PosTicketLineItem } from "@corely/contracts";
import { SaleBuilder } from "@corely/pos-core";

const saleBuilder = new SaleBuilder();

export type CartItem = PosTicketLineItem;

interface CartState {
  items: CartItem[];
  customerPartyId: string | null;
  notes: string | null;
  orderDiscountCents: number;

  addItem: (item: Omit<CartItem, "lineItemId" | "lineTotalCents">) => void;
  updateQuantity: (lineItemId: string, quantity: number) => void;
  updateLineDiscount: (lineItemId: string, discountCents: number) => void;
  updateDiscount: (lineItemId: string, discountCents: number) => void;
  removeItem: (lineItemId: string) => void;
  clearCart: () => void;
  setCustomer: (customerPartyId: string | null) => void;
  setNotes: (notes: string | null) => void;
  setOrderDiscount: (discountCents: number) => void;
  hydrate: (payload: {
    items: CartItem[];
    customerPartyId: string | null;
    notes: string | null;
    orderDiscountCents: number;
  }) => void;
  getTotals: () => {
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    orderDiscountCents: number;
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerPartyId: null,
  notes: null,
  orderDiscountCents: 0,

  addItem: (item) => {
    const { items } = get();
    const existingItem = items.find((i) => i.productId === item.productId);

    if (existingItem) {
      const quantity = existingItem.quantity + item.quantity;
      const lineTotalCents = saleBuilder.calculateLineTotal(
        quantity,
        existingItem.unitPriceCents,
        existingItem.discountCents
      );
      set({
        items: items.map((i) =>
          i.lineItemId === existingItem.lineItemId ? { ...i, quantity, lineTotalCents } : i
        ),
      });
    } else {
      const lineItemId = uuidv4();
      const lineTotalCents = saleBuilder.calculateLineTotal(
        item.quantity,
        item.unitPriceCents,
        item.discountCents
      );
      set({
        items: [...items, { ...item, lineItemId, lineTotalCents }],
      });
    }
  },

  updateQuantity: (lineItemId, quantity) => {
    if (quantity <= 0) {
      return;
    }
    set({
      items: get().items.map((item) => {
        if (item.lineItemId !== lineItemId) {
          return item;
        }
        return {
          ...item,
          quantity,
          lineTotalCents: saleBuilder.calculateLineTotal(
            quantity,
            item.unitPriceCents,
            item.discountCents
          ),
        };
      }),
    });
  },

  updateLineDiscount: (lineItemId, discountCents) => {
    const safeDiscount = Math.max(0, discountCents);
    set({
      items: get().items.map((item) => {
        if (item.lineItemId !== lineItemId) {
          return item;
        }
        return {
          ...item,
          discountCents: safeDiscount,
          lineTotalCents: saleBuilder.calculateLineTotal(
            item.quantity,
            item.unitPriceCents,
            safeDiscount
          ),
        };
      }),
    });
  },

  updateDiscount: (lineItemId, discountCents) => {
    get().updateLineDiscount(lineItemId, discountCents);
  },

  removeItem: (lineItemId) => {
    set({
      items: get().items.filter((item) => item.lineItemId !== lineItemId),
    });
  },

  clearCart: () => {
    set({
      items: [],
      customerPartyId: null,
      notes: null,
      orderDiscountCents: 0,
    });
  },

  setCustomer: (customerPartyId) => {
    set({ customerPartyId });
  },

  setNotes: (notes) => {
    set({ notes });
  },

  setOrderDiscount: (discountCents) => {
    set({ orderDiscountCents: Math.max(0, discountCents) });
  },

  hydrate: ({ items, customerPartyId, notes, orderDiscountCents }) => {
    set({
      items,
      customerPartyId,
      notes,
      orderDiscountCents,
    });
  },

  getTotals: () => {
    const { items, orderDiscountCents } = get();
    const subtotalCents = items.reduce((sum, item) => {
      return sum + item.lineTotalCents;
    }, 0);

    const discountedSubtotal = Math.max(0, subtotalCents - orderDiscountCents);
    const taxCents = Math.round(discountedSubtotal * 0.1);
    const totalCents = discountedSubtotal + taxCents;

    return { subtotalCents, taxCents, totalCents, orderDiscountCents };
  },
}));
