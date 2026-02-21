import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Badge, Button } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@/shared/list-kit";
import { formatDate } from "@/shared/lib/formatters";
import type { ClassGroupKind, ClassGroupLifecycle, ListClassGroupsInput } from "@corely/contracts";
import { useCohortsListQuery } from "../../hooks/use-classes-academy";

const lifecycleOptions: ClassGroupLifecycle[] = [
  "DRAFT",
  "PUBLISHED",
  "RUNNING",
  "ENDED",
  "ARCHIVED",
];
const kindOptions: ClassGroupKind[] = ["COHORT", "DROP_IN", "OFFICE_HOURS", "WORKSHOP"];

export default function CohortsListScreen() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [state, setState] = useListUrlState(
    {
      page: 1,
      pageSize: 20,
      sort: "updatedAt:desc",
    },
    { storageKey: "classes-cohorts-list-v1_1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "lifecycle",
        label: "Lifecycle",
        type: "select",
        options: lifecycleOptions.map((value) => ({ label: value, value })),
      },
      {
        key: "kind",
        label: "Kind",
        type: "select",
        options: kindOptions.map((value) => ({ label: value, value })),
      },
      {
        key: "startAtFrom",
        label: "Start date from",
        type: "text",
      },
      {
        key: "startAtTo",
        label: "Start date to",
        type: "text",
      },
    ],
    []
  );

  const params = useMemo<ListClassGroupsInput>(() => {
    const lifecycle = state.filters?.find((item) => item.field === "lifecycle")?.value;
    const kind = state.filters?.find((item) => item.field === "kind")?.value;
    const startAtFrom = state.filters?.find((item) => item.field === "startAtFrom")?.value;
    const startAtTo = state.filters?.find((item) => item.field === "startAtTo")?.value;
    return {
      q: state.q,
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      lifecycle:
        typeof lifecycle === "string" && lifecycle.length > 0
          ? (lifecycle as ClassGroupLifecycle)
          : undefined,
      kind:
        typeof kind === "string" && kind.length > 0
          ? (kind as ClassGroupKind)
          : ("COHORT" as const),
      startAtFrom:
        typeof startAtFrom === "string" && startAtFrom.length > 0 ? startAtFrom : undefined,
      startAtTo: typeof startAtTo === "string" && startAtTo.length > 0 ? startAtTo : undefined,
      filters: state.filters,
    };
  }, [state.filters, state.page, state.pageSize, state.q, state.sort]);

  const { data, isLoading, isError, error } = useCohortsListQuery(params);
  const items = data?.items ?? [];

  return (
    <>
      <CrudListPageLayout
        title="Cohorts"
        subtitle="Manage active and upcoming language cohorts"
        primaryAction={
          <Button
            variant="accent"
            data-testid="classes-cohorts-new-button"
            onClick={() => navigate("/classes/cohorts/new")}
          >
            <Plus className="h-4 w-4" />
            New cohort
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setState({ sort: value })}
            sortOptions={[
              { label: "Newest", value: "updatedAt:desc" },
              { label: "Oldest", value: "updatedAt:asc" },
              { label: "Name A-Z", value: "name:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <span className="text-sm text-destructive">
                {error instanceof Error ? error.message : "Failed to load cohorts"}
              </span>
            ) : null}
          </ListToolbar>
        }
        filters={
          state.filters && state.filters.length > 0 ? (
            <ActiveFilterChips
              filters={state.filters}
              onRemove={(filter) => {
                const next = state.filters?.filter((item) => item !== filter) ?? [];
                setState({ filters: next, page: 1 });
              }}
              onClearAll={() => setState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <div data-testid="classes-cohorts-list">
          {isLoading ? (
            <div className="rounded-md border border-border p-6 text-sm text-muted-foreground">
              Loading cohorts...
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              title="No cohorts found"
              description="Create a cohort or adjust filters."
              action={
                <Button asChild variant="accent">
                  <Link to="/classes/cohorts/new">Create cohort</Link>
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Lifecycle
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Start / End
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Delivery
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      Capacity
                    </th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((cohort) => (
                    <tr
                      key={cohort.id}
                      className="border-b border-border last:border-0"
                      data-testid={`classes-cohort-row-${cohort.id}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium">{cohort.name}</td>
                      <td className="px-4 py-3 text-sm">
                        <Badge variant="outline">{cohort.lifecycle}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cohort.programId || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cohort.startAt ? formatDate(cohort.startAt, "en-US") : "—"}
                        {" / "}
                        {cohort.endAt ? formatDate(cohort.endAt, "en-US") : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cohort.deliveryMode}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {cohort.capacity ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CrudRowActions
                          primaryAction={{ label: "Open", href: `/classes/cohorts/${cohort.id}` }}
                          secondaryActions={[
                            { label: "Edit", href: `/classes/cohorts/${cohort.id}/edit` },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        fields={filterFields}
        filters={state.filters ?? []}
        onApply={(filters) => setState({ filters, page: 1 })}
      />
    </>
  );
}
