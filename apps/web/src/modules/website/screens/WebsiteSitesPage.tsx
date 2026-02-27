import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ExternalLink, Globe, Plus } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { websiteApi } from "@/lib/website-api";
import { websiteDomainKeys, websiteSiteListKey } from "../queries";
import type { WebsiteDomain, WebsiteSite } from "@corely/contracts";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { getPublicWebsiteUrl } from "@/shared/lib/public-urls";

export default function WebsiteSitesPage() {
  const navigate = useNavigate();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const { activeWorkspace } = useWorkspace();

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
  const domainQueries = useQueries({
    queries: sites.map((site) => ({
      queryKey: websiteDomainKeys.list(site.id),
      queryFn: () => websiteApi.listDomains(site.id),
    })),
  });

  const domainsBySiteId = useMemo(() => {
    const map = new Map<string, WebsiteDomain[]>();
    domainQueries.forEach((query, index) => {
      const site = sites[index];
      if (!site) {
        return;
      }
      map.set(site.id, query.data?.items ?? []);
    });
    return map;
  }, [domainQueries, sites]);

  const getPublicUrl = (site: WebsiteSite, hostname?: string | null) => {
    const slug = site.slug?.trim();
    const slugLower = slug?.toLowerCase();
    const hasValidSlug = Boolean(slug) && slugLower !== "undefined" && slugLower !== "null";
    if (!hasValidSlug) {
      console.warn("[WebsiteSitesPage] Invalid site slug", {
        siteId: site.id,
        siteName: site.name,
        siteSlug: site.slug,
        workspaceSlug: activeWorkspace?.slug ?? null,
      });
    }
    return getPublicWebsiteUrl({
      hostname,
      workspaceSlug: activeWorkspace?.slug ?? null,
      websiteSlug: hasValidSlug ? slug : null,
      isDefault: site.isDefault,
      path: "/",
    });
  };

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
                        <td className="px-4 py-3 text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <span>{site.name}</span>
                            {site.isDefault ? <Badge variant="success">Default</Badge> : null}
                            {(() => {
                              const slug = site.slug?.trim();
                              const slugLower = slug?.toLowerCase();
                              const hasValidSlug =
                                Boolean(slug) && slugLower !== "undefined" && slugLower !== "null";
                              return hasValidSlug ? null : (
                                <Badge variant="warning">Missing slug</Badge>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {site.defaultLocale}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(site.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(() => {
                            const domains = domainsBySiteId.get(site.id) ?? [];
                            const primaryDomain =
                              domains.find((domain) => domain.isPrimary) ?? domains[0];
                            const publicUrl = getPublicUrl(site, primaryDomain?.hostname);
                            const secondaryActions = [
                              ...(publicUrl
                                ? [
                                    {
                                      label: "Public view",
                                      onClick: () =>
                                        window.open(publicUrl, "_blank", "noopener,noreferrer"),
                                      icon: <ExternalLink className="h-4 w-4" />,
                                    },
                                  ]
                                : []),
                              {
                                label: "Domains",
                                href: `/website/sites/${site.id}/domains`,
                              },
                              {
                                label: "Menus",
                                href: `/website/sites/${site.id}/menus`,
                              },
                              {
                                label: "Feedback & Q&A",
                                href: `/website/sites/${site.id}/feedback`,
                              },
                              {
                                label: "Wall Of Love",
                                href: `/website/sites/${site.id}/wall-of-love`,
                              },
                              {
                                label: "Edit site",
                                href: `/website/sites/${site.id}/edit`,
                              },
                            ];

                            return (
                              <CrudRowActions
                                primaryAction={{
                                  label: "Manage pages",
                                  href: `/website/sites/${site.id}/pages`,
                                }}
                                secondaryActions={secondaryActions}
                              />
                            );
                          })()}
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
