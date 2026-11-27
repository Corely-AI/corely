import { PaginationSummary } from "@corely/web-shared/shared/components/pagination-summary";
import { useUiCopy } from "@corely/web-shared/shared/i18n/ui-copy";
import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, Plus, Search, Star, Trash2 } from "lucide-react";
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
import type { PortfolioContentStatus, PortfolioProjectType } from "@corely/contracts";

const statusOptions: { label: string; value: "" | PortfolioContentStatus }[] = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
];

const typeOptions: { label: string; value: "" | PortfolioProjectType }[] = [
  { label: "All types", value: "" },
  { label: "Startup", value: "startup" },
  { label: "Agency", value: "agency" },
  { label: "Side hustle", value: "side_hustle" },
  { label: "Open source", value: "open_source" },
  { label: "Other", value: "other" },
];

const statusVariant = (status: PortfolioContentStatus) => {
  switch (status) {
    case "published":
      return "success";
    case "archived":
      return "muted";
    default:
      return "warning";
  }
};

export default function ProjectsPage() {
  const uiCopy = useUiCopy("ui.portfolio-projectspage");
  const { showcaseId } = useParams<{ showcaseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const statusFilter =
    typeof filters.status === "string" ? (filters.status as PortfolioContentStatus) : "";
  const typeFilter = typeof filters.type === "string" ? (filters.type as PortfolioProjectType) : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: portfolioKeys.projects.list(showcaseId ?? "", {
      q: listState.q,
      page: listState.page,
      pageSize: listState.pageSize,
      sort: listState.sort,
      status: statusFilter || undefined,
      type: typeFilter || undefined,
    }),
    queryFn: () => {
      if (!showcaseId) {
        return Promise.resolve({
          items: [],
          pageInfo: { page: 1, pageSize: 10, total: 0, hasNextPage: false },
        });
      }
      return portfolioApi.listProjects(showcaseId, {
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
        status: statusFilter || undefined,
        type: typeFilter || undefined,
      });
    },
    enabled: Boolean(showcaseId),
  });

  const projects = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => portfolioApi.deleteProject(id),
    onSuccess: async () => {
      toast.success(uiCopy("project-deleted"));
      if (showcaseId) {
        await queryClient.invalidateQueries({
          queryKey: ["portfolio", "projects", "list", showcaseId],
        });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete project");
    },
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={uiCopy("search-projects")}
          className="pl-8 w-64"
          defaultValue={listState.q ?? ""}
          onChange={(event) => setListState({ q: event.target.value, page: 1 })}
        />
      </div>
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        value={statusFilter}
        onChange={(event) =>
          setListState({
            filters: {
              ...filters,
              status: event.target.value || undefined,
            },
            page: 1,
          })
        }
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || uiCopy("failed-to-load-projects")}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button
      variant="accent"
      onClick={() => navigate(`/portfolio/showcases/${showcaseId}/projects/new`)}
      disabled={!showcaseId}
    >
      <Plus className="h-4 w-4" />
      {uiCopy("new-project")}
    </Button>
  );

  return (
    <CrudListPageLayout
      title={uiCopy("projects")}
      subtitle="Showcase the work you want clients to see"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingSkeleton variant="cards" label={uiCopy("loading-projects")} />
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title={uiCopy("no-projects-yet")}
              description={uiCopy("add-your-first-project")}
              action={primaryAction}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("title")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("type")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("status")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("featured")}
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        {uiCopy("updated")}
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr
                        key={project.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{project.title}</div>
                          <div className="text-xs text-muted-foreground">{project.slug}</div>
                        </td>
                        <td className="px-4 py-3 text-sm capitalize">
                          {project.type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={statusVariant(project.status)}>{project.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {project.featured ? (
                            <span className="inline-flex items-center gap-1 text-amber-500">
                              <Star className="h-4 w-4" />
                              {uiCopy("featured")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(project.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              href: `/portfolio/projects/${project.id}/edit`,
                            }}
                            secondaryActions={[
                              {
                                label: "Delete",
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => setDeleteTarget(project.id),
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
        title={uiCopy("delete-project")}
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
