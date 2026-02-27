"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { SonnerToaster } from "@/components/ui";
import { CartProvider } from "../lib/cart.store";

export function StorefrontProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        {children}
        <SonnerToaster />
      </CartProvider>
    </QueryClientProvider>
  );
}
