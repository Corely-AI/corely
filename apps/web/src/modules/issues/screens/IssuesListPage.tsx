import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  ListToolbar,
  ActiveFilterChips,
  useListUrlState,
  FilterPanel,
  type FilterFieldDef,
} from "@/shared/list-kit";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { formatDate } from "@/shared/lib/formatters";
import { issuesApi } from "@/lib/issues-api";
import { issueKeys } from "../queries";
import type { IssuePriority, IssueSiteType, IssueStatus } from "@corely/contracts";

const STATUS_OPTIONS = [
  { label: "New", value: "NEW" },
  { label: "Triaged", value: "TRIAGED" },
  { label: "In progress", value: "IN_PROGRESS" },
  { label: "Waiting", value: "WAITING" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Reopened", value: "REOPENED" },
];

const SITE_OPTIONS = [
  { label: "Field", value: "FIELD" },
  { label: "Customer", value: "CUSTOMER" },
  { label: "Manufacturer", value: "MANUFACTURER" },
];

const getFilterValue = (filters: any[] | undefined, field: string) => {
  const match = filters?.find((filter) => filter.field === field && filter.operator === "eq");
  return match ? String(match.value) : undefined;
};

export default function IssuesListPage() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 20, sort: "createdAt:desc" },
    { storageKey: "issues-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "siteType", label: "Site type", type: "select", options: SITE_OPTIONS },
      { key: "assigneeUserId", label: "Assignee", type: "text" },
      { key: "customerPartyId", label: "Customer ID", type: "text" },
      { key: "manufacturerPartyId", label: "Manufacturer ID", type: "text" },
    ],
    []
  );

  const status = useMemo<IssueStatus | undefined>(() => {
    const value = getFilterValue(state.filters, "status");
    return value as IssueStatus | undefined;
  }, [state.filters]);

  const siteType = useMemo<IssueSiteType | undefined>(() => {
    const value = getFilterValue(state.filters, "siteType");
    return value as IssueSiteType | undefined;
  }, [state.filters]);

  const assigneeUserId = useMemo(
    () => getFilterValue(state.filters, "assigneeUserId"),
    [state.filters]
  );
  const customerPartyId = useMemo(
    () => getFilterValue(state.filters, "customerPartyId"),
    [state.filters]
  );
  const manufacturerPartyId = useMemo(
    () => getFilterValue(state.filters, "manufacturerPartyId"),
    [state.filters]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: issueKeys.list({
      ...state,
      status,
      siteType,
      assigneeUserId,
      customerPartyId,
      manufacturerPartyId,
    }),
    queryFn: () =>
      issuesApi.listIssues({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        filters: state.filters,
        status,
        siteType,
        assigneeUserId,
        customerPartyId,
        manufacturerPartyId,
      }),
    placeholderData: keepPreviousData,
  });

  const issues = data?.items ?? [];
  const pageInfo = data?.pageInfo;

  const priorityColor = (priority?: IssuePriority | null) => {
    switch (priority) {
      case "URGENT":
        return "destructive";
      case "HIGH":
        return "warning";
      case "LOW":
        return "muted";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <CrudListPageLayout
        title="Issues"
        subtitle="Track and triage field issues"
        primaryAction={
          <Button variant="accent" onClick={() => navigate("/issues/new")}>
            <Plus className="h-4 w-4" />
            Report issue
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Created (Newest)", value: "createdAt:desc" },
              { label: "Created (Oldest)", value: "createdAt:asc" },
              { label: "Updated (Newest)", value: "updatedAt:desc" },
              { label: "Priority (High)", value: "priority:desc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load issues"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((f) => f !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0" data-testid="issues-list">
            {isLoading ? (
              <div className="space-y-4 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-12 w-full animate-pulse rounded bg-muted/20" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No issues yet"
                description="Create your first issue report to start tracking."
                action={
                  <Button variant="outline" onClick={() => navigate("/issues/new")}>
                    Report issue
                  </Button>
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Title
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Priority
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Site
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Assignee
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          Created
                        </th>
                        <th className="w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue) => (
                        <tr
                          key={issue.id}
                          className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm font-medium">{issue.title}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{issue.status.replace(/_/g, " ")}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={priorityColor(issue.priority)}>
                              {issue.priority ?? "MEDIUM"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">{issue.siteType}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {issue.assigneeUserId ?? "Unassigned"}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {formatDate(issue.createdAt, "en-US")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <CrudRowActions
                              primaryAction={{ label: "Open", href: `/issues/${issue.id}` }}
                              secondaryActions={[]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {pageInfo && (
                  <Pagination className="border-t border-border p-4">
                    <PaginationContent>
                      <PaginationItem>
                        <span className="text-sm text-muted-foreground mr-4">
                          Page {pageInfo.page} of {Math.ceil(pageInfo.total / pageInfo.pageSize)}
                        </span>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => state.page > 1 && setUrlState({ page: state.page - 1 })}
                          className={
                            state.page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            pageInfo.hasNextPage && setUrlState({ page: state.page + 1 })
                          }
                          className={
                            !pageInfo.hasNextPage
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
        fields={filterFields}
      />
    </>
  );
}
