import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/components/EmptyState";
import {
  CrudListPageLayout,
  CrudRowActions,
  ConfirmDeleteDialog,
  useCrudUrlState,
} from "@/shared/crud";
import { formatDate } from "@/shared/lib/formatters";
import { portfolioApi } from "@/lib/portfolio-api";
import { portfolioKeys } from "../queries";
import { toast } from "sonner";
import type { PortfolioContentStatus } from "@corely/contracts";

const statusOptions: { label: string; value: "" | PortfolioContentStatus }[] = [
  { label: "All statuses", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" },
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

export default function TeamPage() {
  const { showcaseId } = useParams<{ showcaseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [listState, setListState] = useCrudUrlState({ pageSize: 10 });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const filters = useMemo(() => listState.filters ?? {}, [listState.filters]);
  const statusFilter =
    typeof filters.status === "string" ? (filters.status as PortfolioContentStatus) : "";

  const { data, isLoading, isError, error } = useQuery({
    queryKey: portfolioKeys.team.list(showcaseId ?? "", {
      q: listState.q,
      page: listState.page,
      pageSize: listState.pageSize,
      sort: listState.sort,
      status: statusFilter || undefined,
    }),
    queryFn: () => {
      if (!showcaseId) {
        return Promise.resolve({
          items: [],
          pageInfo: { page: 1, pageSize: 10, total: 0, hasNextPage: false },
        });
      }
      return portfolioApi.listTeamMembers(showcaseId, {
        q: listState.q,
        page: listState.page,
        pageSize: listState.pageSize,
        sort: listState.sort,
        status: statusFilter || undefined,
      });
    },
    enabled: Boolean(showcaseId),
  });

  const members = data?.items ?? [];

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => portfolioApi.deleteTeamMember(id),
    onSuccess: async () => {
      toast.success("Team member deleted");
      if (showcaseId) {
        await queryClient.invalidateQueries({
          queryKey: ["portfolio", "team", "list", showcaseId],
        });
      }
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to delete team member");
    },
  });

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team"
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
      {isError ? (
        <div className="text-sm text-destructive">
          {(error as Error)?.message || "Failed to load team"}
        </div>
      ) : null}
    </div>
  );

  const primaryAction = (
    <Button
      variant="accent"
      onClick={() => navigate(`/portfolio/showcases/${showcaseId}/team/new`)}
      disabled={!showcaseId}
    >
      <Plus className="h-4 w-4" />
      New team member
    </Button>
  );

  return (
    <CrudListPageLayout
      title="Team"
      subtitle="Highlight the people behind the work"
      primaryAction={primaryAction}
      toolbar={toolbar}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading team...</div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Add people to show who delivers the work."
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
                        Role
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Status
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Updated
                      </th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{member.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm">{member.roleTitle}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={statusVariant(member.status)}>{member.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(member.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{
                              label: "Edit",
                              href: `/portfolio/team/${member.id}/edit`,
                            }}
                            secondaryActions={[
                              {
                                label: "Delete",
                                destructive: true,
                                icon: <Trash2 className="h-4 w-4" />,
                                onClick: () => setDeleteTarget(member.id),
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
      <ConfirmDeleteDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        trigger={null}
        title="Delete team member"
        description="This will permanently delete the team member."
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
