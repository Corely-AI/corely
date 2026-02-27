"use client";

import { useState } from "react";
import { CartDrawer } from "./cart-drawer";
import { StorefrontHeader } from "./header";

type StorefrontLayoutProps = {
  children: React.ReactNode;
  workspaceSlug?: string | null;
};

export function StorefrontLayout({ children, workspaceSlug }: StorefrontLayoutProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <StorefrontHeader workspaceSlug={workspaceSlug} onOpenCart={() => setIsCartOpen(true)} />
      <main className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6">{children}</main>
      <CartDrawer open={isCartOpen} onOpenChange={setIsCartOpen} workspaceSlug={workspaceSlug} />
    </div>
  );
}
