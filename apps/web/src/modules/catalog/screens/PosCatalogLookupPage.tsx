import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Package, PackagePlus, Pencil } from "lucide-react";
import { Badge, Button, Card, CardContent, Input } from "@corely/ui";
import { catalogApi } from "@/lib/catalog-api";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { hasPermission, useEffectivePermissions } from "@corely/web-shared/shared/lib/permissions";
import { catalogItemKeys } from "../queries";

export default function PosCatalogLookupPage() {
  const uiCopy = useUiCopy("ui.catalog-poscataloglookuppage");
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data: effectivePermissions } = useEffectivePermissions();

  const trimmedSearch = search.trim();

  const { data, isLoading, isError } = useQuery({
    queryKey: catalogItemKeys.list({
      q: trimmedSearch || undefined,
      page,
      pageSize: 20,
      status: "ACTIVE",
      sort: "updatedAt:desc",
    }),
    queryFn: () =>
      catalogApi.listItems({
        q: trimmedSearch || undefined,
        page,
        pageSize: 20,
        status: "ACTIVE",
        sort: "updatedAt:desc",
      }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const subtitle = useMemo(
    () => "Look up sellable items, prices, and status without opening full catalog administration.",
    []
  );
  const canQuickAdd =
    hasPermission(effectivePermissions?.permissions, "catalog.quickwrite") ||
    hasPermission(effectivePermissions?.permissions, "catalog.write");

  return (
    <CrudListPageLayout
      title={uiCopy("pos-catalog")}
      subtitle={subtitle}
      primaryAction={
        canQuickAdd ? (
          <Button variant="accent" onClick={() => navigate("/pos/catalog/new")}>
            <PackagePlus className="h-4 w-4" />
            {uiCopy("add-new-item")}
          </Button>
        ) : undefined
      }
      toolbar={
        <div className="w-full max-w-sm">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={uiCopy("search-by-name-or")}
          />
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="p-6 text-sm text-destructive">{uiCopy("catalog-lookup-could-not")}</div>
          ) : null}

          {!isError && isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-12 w-full animate-pulse rounded bg-muted/20" />
              ))}
            </div>
          ) : null}

          {!isError && !isLoading && items.length === 0 ? (
            <EmptyState
              icon={Package}
              title={uiCopy("no-catalog-items-found")}
              description={
                trimmedSearch
                  ? "Try a different product name or code."
                  : "No active catalog items are available for this workspace."
              }
            />
          ) : null}

          {!isError && !isLoading && items.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {uiCopy("code")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {uiCopy("name")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {uiCopy("type")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {uiCopy("status")}
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                        {uiCopy("updated")}
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                        {uiCopy("actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-3 font-mono text-xs">{item.code}</td>
                        <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                        <td className="px-4 py-3 text-sm">{item.type}</td>
                        <td className="px-4 py-3">
                          <Badge variant={item.status === "ACTIVE" ? "success" : "secondary"}>
                            {item.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(item.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canQuickAdd ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/pos/catalog/${item.id}/edit`)}
                            >
                              <Pencil className="h-4 w-4" />
                              {uiCopy("edit")}
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pageInfo ? (
                <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    <PaginationSummary
                      page={pageInfo.page}
                      pages={Math.max(1, Math.ceil(pageInfo.total / pageInfo.pageSize))}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      {uiCopy("previous")}
                    </button>
                    <button
                      type="button"
                      className="rounded border border-border px-3 py-1 text-sm disabled:opacity-50"
                      disabled={!pageInfo.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      {uiCopy("next")}
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </CrudListPageLayout>
  );
}
