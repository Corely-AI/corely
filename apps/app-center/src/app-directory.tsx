import React, { useState } from "react";
import type { AppCatalogItem, AppLaunchId } from "@corely/contracts";
import { Button, Input } from "@corely/ui";
import { catalogLaunchUrl } from "@corely/web-shared/layout/focused-shell-navigation";
import { copy, type Locale } from "./copy";

type Category = "all" | "finance" | "people";
export interface AppDirectoryProps {
  apps: AppCatalogItem[];
  workspaceId: string;
  locale: Locale;
  loading: boolean;
  error: boolean;
  launching: boolean;
  launchError: boolean;
  onRetry: () => void;
  onLaunch: (id: AppLaunchId) => void;
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
  // Only the server's supported launch descriptors appear. No speculative catalog tiles.
  const destinations = apps.filter((app) => app.launch);
  const term = search.trim().toLocaleLowerCase(locale);
  const filtered = destinations.filter(
    (app) =>
      app.launch &&
      (category === "all" || app.launch.category === category) &&
      app.launch.displayName[locale].toLocaleLowerCase(locale).includes(term)
  );

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
            <option value="finance">{text.finance}</option>
            <option value="people">{text.people}</option>
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
          {(["finance", "people"] as const).map((group) => {
            const entries = filtered.filter((app) => app.launch?.category === group);
            return entries.length ? (
              <section key={group} aria-label={text[group]} className="space-y-3">
                <h2 className="text-lg font-semibold">{text[group]}</h2>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {entries.map((app) => {
                    const launch = app.launch;
                    if (!launch) {
                      return null;
                    }
                    const available = Boolean(catalogLaunchUrl(app, workspaceId));
                    const reason =
                      !app.enabled || launch.availability === "app-disabled"
                        ? text.disabled
                        : launch.availability === "coming-soon"
                          ? text.soon
                          : text.unavailable;
                    return (
                      <article
                        key={app.appId}
                        className="flex min-w-0 flex-col items-start gap-5 rounded-xl border bg-card p-6 text-card-foreground shadow-sm"
                      >
                        <div
                          aria-hidden="true"
                          className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-lg font-semibold text-primary"
                        >
                          {launch.displayName[locale].slice(0, 1)}
                        </div>
                        <h3 className="break-words text-xl font-semibold">
                          {launch.displayName[locale]}
                        </h3>
                        <Button
                          className="min-h-11 w-full"
                          variant={available ? "default" : "outline"}
                          disabled={!available || launching}
                          aria-label={`${available ? text.open : reason}: ${launch.displayName[locale]}`}
                          onClick={() => onLaunch(launch.launchId)}
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
