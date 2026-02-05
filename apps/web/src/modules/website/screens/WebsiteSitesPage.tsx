import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Globe } from "lucide-react";
import { Button, Card, CardContent, Input } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { websiteApi } from "@/lib/website-api";
import { websiteSiteListKey } from "../queries";

export default function WebsiteSitesPage() {
  const navigate = useNavigate();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });

  const queryKey = useMemo(
    () =>
      websiteSiteListKey({
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
      }),
    [listState]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      websiteApi.listSites({
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
      }),
  });

  const sites = data?.items ?? [];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Input
          placeholder="Search sites"
          className="w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || "Failed to load sites"}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/website/sites/new")}>
      <Plus className="h-4 w-4" />
      New site
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Websites"
      subtitle="Manage sites, domains, pages, and menus"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading sites...</div>
          ) : sites.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No sites yet"
              description="Create your first site to get started."
              action={primaryAction}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Default locale
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Updated
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
                      <tr
                        key={site.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">{site.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {site.defaultLocale}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(site.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Manage pages",
                              href: `/website/sites/${site.id}/pages`,
                            }}
                            secondaryActions={[
                              {
                                label: "Domains",
                                href: `/website/sites/${site.id}/domains`,
                              },
                              {
                                label: "Menus",
                                href: `/website/sites/${site.id}/menus`,
                              },
                              {
                                label: "Edit site",
                                href: `/website/sites/${site.id}/edit`,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data?.pageInfo ? (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
                  <div>
                    Page {data.pageInfo.page} · {data.pageInfo.total} total
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
