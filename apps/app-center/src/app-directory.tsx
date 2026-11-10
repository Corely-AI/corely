import React, { useState } from "react";
import type { AppCatalogItem } from "@corely/contracts";
import { Button, Input } from "@corely/ui";
import { catalogEntryUrl, catalogMetadata } from "./catalog-entry";
import { AppLogo } from "@corely/web-shared/layout/app-logo";
import { copy, type Locale } from "./copy";

type Category = "all" | "finance" | "people" | "sales" | "operations" | "content";
const categories = ["finance", "people", "sales", "operations", "content"] as const;
export interface AppDirectoryProps {
  apps: AppCatalogItem[];
  workspaceId: string;
  locale: Locale;
  loading: boolean;
  error: boolean;
  launching: boolean;
  launchError: boolean;
  onRetry: () => void;
  onLaunch: (id: string) => void;
}

export function AppDirectory({
  apps,
  workspaceId,
  locale,
  loading,
  error,
  launching,
  launchError,
  onRetry,
  onLaunch,
}: AppDirectoryProps) {
  const text = copy[locale];
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  // The server resolves authorized destinations; no planned catalog tiles are manufactured.
  const destinations = apps.filter((app) => catalogMetadata(app));
  const term = search.trim().toLocaleLowerCase(locale);
  const filtered = destinations.filter((app) => {
    const entry = catalogMetadata(app);
    return (
      entry &&
      (category === "all" || entry.category === category) &&
      entry.displayName[locale].toLocaleLowerCase(locale).includes(term)
    );
  });

  return (
    <section aria-label={text.title} className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row">
        <label className="flex-1 space-y-2">
          <span className="text-sm font-medium">{text.search}</span>
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="min-h-11"
          />
        </label>
        <label className="space-y-2">
          <span className="block text-sm font-medium">{text.category}</span>
          <select
            className="min-h-11 w-full rounded-md border bg-background px-3 sm:w-52"
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
          >
            <option value="all">{text.all}</option>
            {categories.map((group) => (
              <option key={group} value={group}>
                {text[group]}
              </option>
            ))}
          </select>
        </label>
      </div>
      {launchError && (
        <div role="alert" className="rounded-lg border p-4">
          <p>{text.launchError}</p>
          <Button variant="outline" onClick={onRetry}>
            {text.retry}
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status">{text.loading}</p>
      ) : error ? (
        <div role="alert" className="space-y-3 rounded-lg border p-6">
          <p>{text.error}</p>
          <Button onClick={onRetry}>{text.retry}</Button>
        </div>
      ) : !destinations.length ? (
        <p role="status" className="rounded-lg border p-6">
          {text.noAccess}
        </p>
      ) : !filtered.length ? (
        <p role="status" className="rounded-lg border p-6">
          {text.noResults}
        </p>
      ) : (
        <div className="space-y-8">
          {categories.map((group) => {
            const entries = filtered.filter((app) => catalogMetadata(app)?.category === group);
            return entries.length ? (
              <section key={group} aria-label={text[group]} className="space-y-3">
                <h2 className="text-lg font-semibold">{text[group]}</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {entries.map((app) => {
                    const launch = catalogMetadata(app);
                    if (!launch) {
                      return null;
                    }
                    const available = Boolean(catalogEntryUrl(app, workspaceId));
                    const reason =
                      !app.enabled || app.launch?.availability === "app-disabled"
                        ? text.disabled
                        : !app.directory && app.launch?.availability === "coming-soon"
                          ? text.soon
                          : text.unavailable;
                    return (
                      <article
                        key={app.appId}
                        className="flex min-w-0 flex-col items-start gap-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
                      >
                        <AppLogo logo={app.directory?.logo} iconKey={app.launch?.iconKey} />
                        <h3 className="break-words text-xl font-semibold">
                          {launch.displayName[locale]}
                        </h3>
                        <Button
                          className="min-h-11 w-full"
                          variant={available ? "default" : "outline"}
                          disabled={!available || launching}
                          aria-label={`${available ? text.open : reason}: ${launch.displayName[locale]}`}
                          onClick={() => onLaunch(app.appId)}
                        >
                          {available ? text.open : reason}
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </section>
            ) : null;
          })}
        </div>
      )}
      {launching && <p role="status">{text.opening}</p>}
    </section>
  );
}
