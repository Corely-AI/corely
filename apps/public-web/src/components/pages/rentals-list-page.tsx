import Link from "next/link";
import { ArrowRight, Search, Users } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  EmptyState,
  Input,
  Logo,
} from "@/components/ui";
import type { RentalProperty, RentalCategory } from "@corely/contracts";
import { buildPublicFileUrl } from "@/lib/public-api";
import { siteConfig } from "@/lib/site";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&q=80&w=800";

export function RentalsListContent({
  properties,
  categories,
  basePath,
  query,
  categorySlug,
}: {
  properties: RentalProperty[];
  categories: RentalCategory[];
  basePath: string;
  query?: string;
  categorySlug?: string;
}) {
  const normalizedBase = basePath.replace(/\/$/, "");
  const clearSearchUrl = categorySlug
    ? `${normalizedBase}?category=${encodeURIComponent(categorySlug)}`
    : normalizedBase;

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={normalizedBase} className="flex items-center gap-2 group">
            <div className="bg-accent/10 p-1.5 rounded-lg group-hover:bg-accent/20 transition-colors">
              <Logo size="sm" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">Stays</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href={`${siteConfig.appUrl}/auth/login`}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Staff login
            </Link>
            <Button variant="accent" size="sm" className="hidden sm:flex">
              List your property
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 space-y-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b border-border pb-10">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
              Find your next{" "}
              <span className="text-accent underline decoration-accent/30 underline-offset-8">
                escape
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Discover a curated collection of unique vacation rentals for your next adventure.
            </p>
          </div>
          <form
            action={normalizedBase}
            method="get"
            className="relative w-full md:w-96 shadow-sm border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-accent/20 transition-all"
          >
            {categorySlug ? <input type="hidden" name="category" value={categorySlug} /> : null}
            <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              name="q"
              placeholder="Where are you going?"
              className="pl-11 h-12 border-none focus-visible:ring-0 text-base"
              defaultValue={query}
            />
          </form>
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-4 -mx-6 px-6">
            <Button
              asChild
              variant={!categorySlug ? "accent" : "outline"}
              size="sm"
              className="rounded-full shadow-sm"
            >
              <Link
                href={query ? `${normalizedBase}?q=${encodeURIComponent(query)}` : normalizedBase}
              >
                All Stays
              </Link>
            </Button>
            {categories.map((cat) => {
              const url = new URL(normalizedBase, "http://localhost");
              if (query) {
                url.searchParams.set("q", query);
              }
              url.searchParams.set("category", cat.slug);
              return (
                <Button
                  key={cat.id}
                  asChild
                  variant={categorySlug === cat.slug ? "accent" : "outline"}
                  size="sm"
                  className="rounded-full shadow-sm whitespace-nowrap"
                >
                  <Link href={`${url.pathname}${url.search}`}>{cat.name}</Link>
                </Button>
              );
            })}
          </div>
        )}

        {properties.length === 0 ? (
          <EmptyState
            title="No vacation rentals found"
            description="We couldn't find any properties matching your search. Try adjusting your filters."
            action={
              <Button asChild variant="outline">
                <Link href={clearSearchUrl}>Clear search</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {properties.map((property) => {
              const coverUrl = property.coverImageFileId
                ? buildPublicFileUrl(property.coverImageFileId)
                : FALLBACK_IMAGE;
              const detailPath = `${normalizedBase}/${property.slug}`;

              return (
                <Link key={property.id} href={detailPath} className="group">
                  <Card className="h-full border-none shadow-none bg-transparent group-hover:translate-y-[-4px] transition-all duration-300">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-4 shadow-md bg-muted">
                      <img
                        src={coverUrl}
                        alt={property.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <Badge className="bg-white/90 text-black hover:bg-white border-none shadow-sm backdrop-blur-sm">
                          <Users className="h-3 w-3 mr-1" />
                          {property.maxGuests || 2} guests
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl font-bold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                          {property.name}
                        </h2>
                      </div>
                      {property.categories && property.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {property.categories.map((cat) => (
                            <span
                              key={cat.id}
                              className="text-[10px] uppercase tracking-wider font-bold text-accent/70 bg-accent/5 px-1.5 py-0.5 rounded"
                            >
                              {cat.name}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                        {property.summary || "No summary available."}
                      </p>
                    </CardContent>
                    <CardFooter className="p-0 mt-4 flex items-center justify-between border-t border-border pt-4">
                      <div className="flex flex-col">
                        {property.price && property.currency ? (
                          <span className="text-sm font-bold">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: property.currency,
                              maximumFractionDigits: 0,
                            }).format(property.price)}{" "}
                            <span className="text-muted-foreground font-normal text-xs">
                              / night
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                            Details
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <footer className="bg-card border-t border-border py-16 mt-20">
        <div className="max-w-7xl mx-auto px-6 grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-xl font-bold tracking-tight">Corely Stays</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Exceptional vacation rentals curated for the modern traveler. Book your next stay with
              confidence.
            </p>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-widest text-xs text-foreground">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href={normalizedBase} className="hover:text-accent transition-colors">
                  All Properties
                </Link>
              </li>
              <li>
                <Link href={normalizedBase} className="hover:text-accent transition-colors">
                  Cabins
                </Link>
              </li>
              <li>
                <Link href={normalizedBase} className="hover:text-accent transition-colors">
                  Beachfront
                </Link>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-widest text-xs text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Safety Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Cancellation Options
                </a>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-bold uppercase tracking-widest text-xs text-foreground">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-accent transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-border mt-16 pt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Corely AI Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
