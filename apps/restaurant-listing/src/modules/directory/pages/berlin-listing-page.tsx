import {
  BrowserLanguageSelect,
  useBrowserLocale,
} from "@corely/web-shared/shared/i18n/browser-locale";
import messages from "@/shared/i18n/locales/directory.json";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import type { DirectoryRestaurantListQuery } from "@corely/contracts";
import { directoryClient } from "@/shared/lib/api";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { LoadingState } from "@/shared/ui/loading-state";
import { directoryQueryKeys } from "../query-keys";

const DISH_OPTIONS = [
  { value: "pho", label: "Pho" },
  { value: "bun-bo", label: "Bun Bo" },
  { value: "banh-mi", label: "Banh Mi" },
  { value: "vegan-pho", label: "Vegan" },
];

const NEIGHBORHOOD_OPTIONS = [
  { value: "mitte", label: "Mitte" },
  { value: "friedrichshain", label: "Friedrichshain" },
  { value: "neukolln", label: "Neukoelln" },
  { value: "prenzlauer-berg", label: "Prenzlauer Berg" },
  { value: "kreuzberg", label: "Kreuzberg" },
];

const getPositiveInt = (raw: string | null, fallback: number) => {
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const BerlinListingPage = () => {
  const locale = useBrowserLocale();
  const copy = messages[locale];
  const [searchParams, setSearchParams] = useSearchParams();

  const queryInput = useMemo<DirectoryRestaurantListQuery>(
    () => ({
      q: searchParams.get("q") || undefined,
      dish: searchParams.get("dish") || undefined,
      neighborhood: searchParams.get("neighborhood") || undefined,
      page: getPositiveInt(searchParams.get("page"), 1),
      pageSize: 12,
    }),
    [searchParams]
  );

  const listingQuery = useQuery({
    queryKey: directoryQueryKeys.list(queryInput),
    queryFn: () => directoryClient.listRestaurants(queryInput),
  });
  const listingData = listingQuery.data;

  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    next.set("page", "1");
    setSearchParams(next);
  };

  const setPage = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
  };

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">{copy.guide}</p>
        <BrowserLanguageSelect className="language-select" />
        <h1>{copy.title}</h1>
        <p>{copy.intro}</p>
      </header>

      <section className="filter-bar" aria-label={copy.filters}>
        <label className="field">
          <span>{copy.search}</span>
          <input
            type="search"
            value={queryInput.q ?? ""}
            placeholder={copy.placeholder}
            onChange={(event) => setParam("q", event.currentTarget.value)}
          />
        </label>

        <label className="field">
          <span>{copy.dish}</span>
          <select
            value={queryInput.dish ?? ""}
            onChange={(event) => setParam("dish", event.currentTarget.value)}
          >
            <option value="">{copy.allDishes}</option>
            {DISH_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.value === "vegan-pho" ? copy.vegan : option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{copy.neighborhood}</span>
          <select
            value={queryInput.neighborhood ?? ""}
            onChange={(event) => setParam("neighborhood", event.currentTarget.value)}
          >
            <option value="">{copy.allNeighborhoods}</option>
            {NEIGHBORHOOD_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {listingQuery.isLoading ? <LoadingState /> : null}

      {listingQuery.error ? (
        <ErrorState
          message={
            listingQuery.error instanceof Error ? listingQuery.error.message : copy.failedLoad
          }
          onRetry={() => listingQuery.refetch()}
        />
      ) : null}

      {!listingQuery.isLoading && !listingQuery.error && listingData ? (
        <>
          {listingData.items.length === 0 ? (
            <EmptyState title={copy.none} message={copy.tryBroader} />
          ) : (
            <div className="card-grid">
              {listingData.items.map((restaurant) => (
                <article key={restaurant.id} className="restaurant-card">
                  <div className="card-meta">
                    <span>{restaurant.neighborhoodSlug ?? "Berlin"}</span>
                    <span>{restaurant.priceRange ?? "$"}</span>
                  </div>
                  <h2>
                    <Link to={`/berlin/restaurants/${restaurant.slug}`}>{restaurant.name}</Link>
                  </h2>
                  <p>{restaurant.shortDescription ?? copy.noDescription}</p>
                  <div className="tag-row">
                    {restaurant.dishTags.slice(0, 4).map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="address">{restaurant.addressLine}</p>
                </article>
              ))}
            </div>
          )}

          <div className="pagination">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={queryInput.page <= 1}
              onClick={() => setPage(Math.max(1, queryInput.page - 1))}
            >
              {copy.previous}
            </button>
            <span>
              {copy.page
                .replace(
                  "{{page}}",
                  new Intl.NumberFormat(locale).format(listingData.pageInfo.page)
                )
                .replace(
                  "{{total}}",
                  new Intl.NumberFormat(locale).format(
                    Math.max(
                      1,
                      Math.ceil(listingData.pageInfo.total / listingData.pageInfo.pageSize)
                    )
                  )
                )}
            </span>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!listingData.pageInfo.hasNextPage}
              onClick={() => setPage(queryInput.page + 1)}
            >
              {copy.next}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};
