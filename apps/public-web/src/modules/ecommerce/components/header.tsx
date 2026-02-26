"use client";

import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge, Button, Input, Logo, Skeleton } from "@/components/ui";
import { useCatalogCategories } from "../hooks/use-catalog-categories";
import { useCart } from "../hooks/use-cart";
import { slugify } from "../lib/image";
import { ecommerceRoutes } from "../routes";

type StorefrontHeaderProps = {
  workspaceSlug?: string | null;
  onOpenCart: () => void;
};

export function StorefrontHeader({ workspaceSlug, onOpenCart }: StorefrontHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cart = useCart();

  const [searchText, setSearchText] = useState(searchParams.get("q") ?? "");

  const categoriesQuery = useCatalogCategories({
    page: 1,
    pageSize: 6,
    workspaceSlug,
  });

  const categoryLinks = useMemo(
    () =>
      (categoriesQuery.data?.items ?? []).map((category) => ({
        id: category.id,
        label: category.name,
        href: ecommerceRoutes.collection(slugify(category.name), workspaceSlug),
      })),
    [categoriesQuery.data?.items, workspaceSlug]
  );

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (searchText.trim()) {
      nextSearchParams.set("q", searchText.trim());
    } else {
      nextSearchParams.delete("q");
    }
    nextSearchParams.set("page", "1");

    const nextQuery = nextSearchParams.toString();
    router.push(`${ecommerceRoutes.collections(workspaceSlug)}${nextQuery ? `?${nextQuery}` : ""}`);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={ecommerceRoutes.home(workspaceSlug)} className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="text-base font-semibold tracking-tight">Corely Store</span>
          </Link>
          {workspaceSlug ? <Badge variant="secondary">{workspaceSlug}</Badge> : null}
        </div>

        <nav className="hidden items-center gap-4 md:flex">
          <Link
            href={ecommerceRoutes.collections(workspaceSlug)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Collections
          </Link>
          <Link
            href={ecommerceRoutes.checkout(workspaceSlug)}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Checkout
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="hidden items-center gap-2 md:flex">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search products"
                className="h-9 w-64 pl-9"
              />
            </div>
            <Button type="submit" size="sm" variant="outline">
              Search
            </Button>
          </form>

          <Button type="button" variant="outline" className="relative" onClick={onOpenCart}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Cart
            {cart.itemCount > 0 ? (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
                {cart.itemCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pb-4 sm:px-6 md:hidden">
        <form onSubmit={handleSearch} className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search products"
            className="h-9 pl-9"
          />
        </form>
      </div>

      <div className="mx-auto flex w-full max-w-7xl items-center gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
        <Link
          href={ecommerceRoutes.collections(workspaceSlug)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            pathname === ecommerceRoutes.collections(workspaceSlug)
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </Link>

        {categoriesQuery.isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={`category-skeleton-${index}`} className="h-7 w-24 rounded-full" />
            ))
          : categoryLinks.map((category) => (
              <Link
                key={category.id}
                href={category.href}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {category.label}
              </Link>
            ))}
      </div>
    </header>
  );
}
