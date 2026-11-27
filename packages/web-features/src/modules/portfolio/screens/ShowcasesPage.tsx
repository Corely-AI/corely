import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Briefcase, Plus, Search, Trash2 } from "lucide-react";
import { LoadingSkeleton, Button } from "@corely/ui";
import { Badge } from "@corely/ui";
import { Input } from "@corely/ui";
import { Card, CardContent } from "@corely/ui";
import { EmptyState } from "@corely/web-shared/shared/components/EmptyState";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  useCrudUrlState,
} from "@corely/web-shared/shared/crud";
import { formatDate } from "@corely/web-shared/shared/lib/formatters";
import { portfolioApi } from "@corely/web-shared/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import { toast } from "sonner";
import type { PortfolioShowcaseType } from "@corely/contracts";

const typeOptions: { label: string; value: "" | PortfolioShowcaseType }[] = [
  { label: "All types", value: "" },
  { label: "Individual", value: "individual" },
  { label: "Company", value: "company" },
  { label: "Hybrid", value: "hybrid" },
];

const publishedOptions = [
  { label: "All", value: "" },
  { label: "Published", value: "true" },
  { label: "Draft", value: "false" },
];

const publishedVariant = (published: boolean) => (published ? "success" : "warning");

export default function ShowcasesPage() {
  const uiCopy = useUiCopy("ui.portfolio-showcasespage");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const typeFilter =
    typeof filters.type === "string" ? (filters.type as PortfolioShowcaseType) : "";
  const publishedFilter = typeof filters.isPublished === "string" ? filters.isPublished : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: portfolioKeys.showcases.list({
      q: listState.q,
      page: listState.page,
      pageSize: listState.pageSize,
      sort: listState.sort,
      type: typeFilter || undefined,
      isPublished:
        publishedFilter === "true" ? true : publishedFilter === "false" ? false : undefined,
    }),
    queryFn: () =>
      portfolioApi.listShowcases({
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
        type: typeFilter || undefined,
        isPublished:
          publishedFilter === "true" ? true : publishedFilter === "false" ? false : undefined,
      }),
  });

  const showcases = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => portfolioApi.deleteShowcase(id),
    onSuccess: async () => {
      toast.success(uiCopy("showcase-deleted"));
      await queryClient.invalidateQueries({ queryKey: ["portfolio", "showcases", "list"] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete showcase");
    },
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={uiCopy("search-showcases")}
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={typeFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              type: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        {typeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={publishedFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              isPublished: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        {publishedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || uiCopy("failed-to-load-showcases")}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/portfolio/showcases/new")}>
      <Plus className="h-4 w-4" />
      {uiCopy("new-showcase")}
    </Button>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("portfolio-showcases")}
      subtitle="Manage freelancer and company profiles"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="cards" label={uiCopy("loading-showcases")} />
          ) : showcases.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={uiCopy("no-showcases-yet")}
              description={uiCopy("create-your-first-showcase")}
              action={primaryAction}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("name")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("type")}
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
                    {showcases.map((showcase) => {
                      const supportsCompany = showcase.type !== "individual";
                      const secondaryActions: Array<{
                        label: string;
                        onClick?: () => void;
                        href?: string;
                        icon?: React.ReactNode;
                        disabled?: boolean;
                        destructive?: boolean;
                      }> = [
                        {
                          label: "Profile",
                          href: `/portfolio/showcases/${showcase.id}/profile`,
                        },
                        {
                          label: "Projects",
                          href: `/portfolio/showcases/${showcase.id}/projects`,
                        },
                        {
                          label: "Clients",
                          href: `/portfolio/showcases/${showcase.id}/clients`,
                        },
                      ];
                      if (supportsCompany) {
                        secondaryActions.push(
                          {
                            label: "Services",
                            href: `/portfolio/showcases/${showcase.id}/services`,
                          },
                          {
                            label: "Team",
                            href: `/portfolio/showcases/${showcase.id}/team`,
                          }
                        );
                      }
                      secondaryActions.push({
                        label: "Delete",
                        destructive: true,
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: () => setDeleteTarget(showcase.id),
                      });

                      return (
                        <tr
                          key={showcase.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">{showcase.name}</div>
                            <div className="text-xs text-muted-foreground">{showcase.slug}</div>
                          </td>
                          <td className="px-4 py-3 text-sm capitalize">{showcase.type}</td>
                          <td className="px-4 py-3 text-sm">
                            <Badge variant={publishedVariant(showcase.isPublished)}>
                              {showcase.isPublished ? uiCopy("published") : uiCopy("draft")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(showcase.updatedAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{
                                label: "Edit",
                                href: `/portfolio/showcases/${showcase.id}/edit`,
                              }}
                              secondaryActions={secondaryActions}
                            />
                          </td>
                        </tr>
                      );
                    })}
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
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title={uiCopy("delete-showcase")}
        description={uiCopy("this-will-permanently-delete")}
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (!deleteTarget) {
            return;
          }
          deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </CrudListPageLayout>
  );
}
