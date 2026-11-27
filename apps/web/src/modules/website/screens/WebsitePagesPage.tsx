import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Search } from "lucide-react";
import { LoadingSkeleton, Button, Card, CardContent, Input, Badge } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions, useCrudUrlState } from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { websiteApi } from "@/lib/website-api";
import { websitePageListKey } from "../queries";

const statusVariant = (status: string) => {
  switch (status) {
    case "PUBLISHED":
      return "success";
    default:
      return "warning";
  }
};

export default function WebsitePagesPage() {
  const uiCopy = useUiCopy("ui.website-websitepagespage");
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });

  const queryKey = useMemo(
    () =>
      websitePageListKey({
        siteId: siteId ?? "",
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
        status: (listState.filters as any)?.status,
      }),
    [listState, siteId]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      siteId
        ? websiteApi.listPages(siteId, {
            q: listState.q,
            page: listState.page,
            pageSize: listState.pageSize,
            sort: listState.sort,
            status: (listState.filters as any)?.status,
          })
        : Promise.resolve({
            items: [],
            pageInfo: { page: 1, pageSize: 10, total: 0, hasNextPage: false },
          }),
    enabled: Boolean(siteId),
  });

  const pages = data?.items ?? [];

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={uiCopy("search-pages")}
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={(listState.filters as any)?.status ?? ""}
        onChange={(event) =>
          setListState({
            filters: {
              ...((listState.filters as any) ?? {}),
              status: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        <option value="">{uiCopy("all-statuses")}</option>
        <option value="DRAFT">{uiCopy("draft")}</option>
        <option value="PUBLISHED">{uiCopy("published")}</option>
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || uiCopy("failed-to-load-pages")}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate(`/website/sites/${siteId}/pages/new`)}>
      <Plus className="h-4 w-4" />
      {uiCopy("new-page")}
    </Button>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("pages")}
      subtitle="Routes and templates for this site"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="list" label={uiCopy("loading-pages")} />
          ) : pages.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={uiCopy("no-pages-yet")}
              description={uiCopy("create-your-first-page")}
              action={primaryAction}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("path")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("locale")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("template")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("status")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("updated")}
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pages.map((page) => (
                      <tr
                        key={page.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">{page.path}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{page.locale}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{page.template}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={statusVariant(page.status)}>{page.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(page.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              href: `/website/pages/${page.id}/edit`,
                            }}
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
                    <PaginationSummary page={data.pageInfo.page} total={data.pageInfo.total} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={listState.page <= 1}
                      onClick={() => setListState({ page: Math.max(1, listState.page - 1) })}
                    >
                      {uiCopy("previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!data.pageInfo.hasNextPage}
                      onClick={() => setListState({ page: listState.page + 1 })}
                    >
                      {uiCopy("next")}
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
