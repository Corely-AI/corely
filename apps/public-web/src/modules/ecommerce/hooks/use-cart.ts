"use client";

import { useCartContext } from "../lib/cart.store";

export const useCart = () => useCartContext();
