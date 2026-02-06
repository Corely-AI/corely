import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Plus, Edit } from "lucide-react";
import { Badge, Button, Card, CardContent } from "@corely/ui";
import { EmptyState } from "@/shared/components/EmptyState";
import { CrudListPageLayout, CrudRowActions } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@/shared/list-kit";
import { formatDate, formatMoney } from "@/shared/lib/formatters";
import { classesApi } from "@/lib/classes-api";
import { classGroupListKey } from "../queries";

const STATUS_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Archived", value: "ARCHIVED" },
];

export default function ClassGroupsListPage() {
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    {
      pageSize: 10,
      sort: "updatedAt:desc",
    },
    { storageKey: "class-groups-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "subject", label: "Subject", type: "text" },
      { key: "level", label: "Level", type: "text" },
    ],
    []
  );

  const filters = useMemo(() => {
    const status = state.filters?.find((f) => f.field === "status" && f.operator === "eq");
    const subject = state.filters?.find((f) => f.field === "subject" && f.operator === "contains");
    const level = state.filters?.find((f) => f.field === "level" && f.operator === "contains");
    return {
      status: status ? String(status.value) : undefined,
      subject: subject ? String(subject.value) : undefined,
      level: level ? String(level.value) : undefined,
    };
  }, [state.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: classGroupListKey(state),
    queryFn: () =>
      classesApi.listClassGroups({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        status: filters.status as any,
        subject: filters.subject,
        level: filters.level,
        filters: state.filters,
      }),
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];

  const primaryAction = (
    <Button variant="accent" onClick={() => navigate("/class-groups/new")}>
      <Plus className="h-4 w-4" />
      New Class Group
    </Button>
  );

  return (
    <>
      <CrudListPageLayout
        title="Class Groups"
        subtitle="Organize your tutoring groups and pricing"
        primaryAction={primaryAction}
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: "Updated (Newest)", value: "updatedAt:desc" },
              { label: "Updated (Oldest)", value: "updatedAt:asc" },
              { label: "Name (A-Z)", value: "name:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || "Failed to load class groups"}
              </div>
            ) : null}
          </ListToolbar>
        }
        filters={
          (state.filters?.length ?? 0) > 0 ? (
            <ActiveFilterChips
              filters={state.filters ?? []}
              onRemove={(filter) => {
                const next = state.filters?.filter((item) => item !== filter) ?? [];
                setUrlState({ filters: next, page: 1 });
              }}
              onClearAll={() => setUrlState({ filters: [], page: 1 })}
            />
          ) : undefined
        }
      >
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading class groups...</div>
            ) : items.length === 0 ? (
              <EmptyState
                title="No class groups yet"
                description="Create your first group to start scheduling sessions."
                action={primaryAction}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Name
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Subject
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Level
                      </th>
                      <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                        Price / session
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
                    {items.map((group) => (
                      <tr
                        key={group.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium">{group.name}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{group.subject}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{group.level}</td>
                        <td className="px-4 py-3 text-sm">
                          {formatMoney(group.defaultPricePerSession, undefined, group.currency)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={group.status === "ACTIVE" ? "success" : "secondary"}>
                            {group.status === "ACTIVE" ? "Active" : "Archived"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {formatDate(group.updatedAt, "en-US")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <CrudRowActions
                            primaryAction={{ label: "Open", href: `/class-groups/${group.id}` }}
                            secondaryActions={[
                              {
                                label: "Edit",
                                href: `/class-groups/${group.id}/edit`,
                                icon: <Edit className="h-4 w-4" />,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </CrudListPageLayout>

      <FilterPanel
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        fields={filterFields}
        filters={state.filters ?? []}
        onApply={(filters) => setUrlState({ filters, page: 1 })}
      />
    </>
  );
}
