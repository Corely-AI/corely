import React, { createContext, useContext } from "react";
import { Outlet, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import type { PublicPortfolioShowcaseOutput } from "@corely/contracts";
import { portfolioPublicApi } from "@/lib/portfolio-public-api";
import { Button } from "@corely/ui";
import { Link } from "react-router-dom";

const PublicPortfolioContext = createContext<PublicPortfolioShowcaseOutput | null>(null);

export const usePublicPortfolioContext = () => {
  const context = useContext(PublicPortfolioContext);
  if (!context) {
    throw new Error("usePublicPortfolioContext must be used within PublicPortfolioLayout");
  }
  return context;
};

export const PublicPortfolioLayout = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  // Simple heuristic: if we are under /p/:slug, we use slug.
  // Otherwise we assume custom domain.
  const isSlugMode = location.pathname.startsWith("/p/");

  const { data, isLoading, error } = useQuery({
    queryKey: isSlugMode
      ? ["public", "portfolio", "showcase", "bySlug", slug]
      : ["public", "portfolio", "showcase", "byDomain", window.location.hostname],
    queryFn: () => {
      if (isSlugMode && slug) {
        return portfolioPublicApi.getShowcaseBySlug(slug);
      } else {
        return portfolioPublicApi.resolveShowcaseByDomain(window.location.hostname);
      }
    },
    // Don't retry 404s endlessly
    retry: (failureCount, error: unknown) => {
      const status = (error as { status?: number })?.status;
      if (status === 404) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 60 * 1000,
  });

  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 bg-muted rounded-full" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }
  if (error || !data) {
    const status =
      (error as { status?: number; response?: { status?: number } })?.status ??
      (error as { status?: number; response?: { status?: number } })?.response?.status;
    const isNotFound = status === 404;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">
          {isNotFound ? t("portfolioPublic.errors.notFound") : t("portfolioPublic.errors.error")}
        </h1>
        <p className="text-muted-foreground max-w-md">
          {isNotFound
            ? t("portfolioPublic.errors.notFoundDesc")
            : t("portfolioPublic.errors.errorDesc")}
        </p>
        {isSlugMode && (
          <Link to="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        )}
      </div>
    );
  }

  const { showcase } = data;

  // Helper to build links that work in both modes
  // If slug mode: /p/:slug/works
  // If domain mode: /works
  const buildLink = (path: string) => {
    // path e.g. "/works" or "/"
    if (isSlugMode) {
      // remove leading slash
      const p = path.startsWith("/") ? path.slice(1) : path;
      return p ? `/p/${slug}/${p}` : `/p/${slug}`;
    }
    return path;
  };

  return (
    <PublicPortfolioContext.Provider value={data}>
      <div className="min-h-screen bg-background font-sans text-foreground">
        {/* Simple Shell Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <Link to={buildLink("/")} className="mr-6 flex items-center space-x-2 font-bold">
              {/* Use showcase name as Logo text if no logo image */}
              <span>{showcase.name}</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <Link
                to={buildLink("/works")}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t("portfolioPublic.nav.works")}
              </Link>
              <Link
                to={buildLink("/clients")}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t("portfolioPublic.nav.clients")}
              </Link>
              {(showcase.type === "company" || showcase.type === "hybrid") && (
                <>
                  <Link
                    to={buildLink("/services")}
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                  >
                    {t("portfolioPublic.nav.services")}
                  </Link>
                  <Link
                    to={buildLink("/team")}
                    className="transition-colors hover:text-foreground/80 text-foreground/60"
                  >
                    {t("portfolioPublic.nav.team")}
                  </Link>
                </>
              )}
            </nav>
            <div className="ml-auto flex items-center space-x-4">
              <Button size="sm">{t("portfolioPublic.common.contact")}</Button>
            </div>
          </div>
        </header>

        <main>
          <Outlet />
        </main>

        <footer className="border-t py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Built with Corely.
            </p>
          </div>
        </footer>
      </div>
    </PublicPortfolioContext.Provider>
  );
};
