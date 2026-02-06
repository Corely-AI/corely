import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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

export default function ClassGroupsListPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: t("classes.groups.statusOptions.active"), value: "ACTIVE" },
      { label: t("classes.groups.statusOptions.archived"), value: "ARCHIVED" },
    ],
    [t]
  );

  const [state, setUrlState] = useListUrlState(
    {
      pageSize: 10,
      sort: "updatedAt:desc",
    },
    { storageKey: "class-groups-list-v1" }
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "status",
        label: t("classes.groups.status"),
        type: "select",
        options: STATUS_OPTIONS,
      },
      { key: "subject", label: t("classes.groups.subject"), type: "text" },
      { key: "level", label: t("classes.groups.level"), type: "text" },
    ],
    [t, STATUS_OPTIONS]
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
    <>
      <Button asChild variant="outline">
        <Link to="/settings/classes">Classes settings</Link>
      </Button>
      <Button variant="accent" onClick={() => navigate("/class-groups/new")}>
        <Plus className="h-4 w-4" />
        {t("classes.groups.new")}
      </Button>
    </>
  );

  return (
    <>
      <CrudListPageLayout
        title={t("classes.groups.title")}
        subtitle={t("classes.groups.subtitle")}
        primaryAction={primaryAction}
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: t("classes.groups.sortOptions.newest"), value: "updatedAt:desc" },
              { label: t("classes.groups.sortOptions.oldest"), value: "updatedAt:asc" },
              { label: t("classes.groups.sortOptions.name"), value: "name:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || t("classes.groups.loadFailed")}
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
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">{t("classes.groups.loading")}</div>
        ) : items.length === 0 ? (
          <EmptyState
            title={t("classes.groups.emptyTitle")}
            description={t("classes.groups.emptyDescription")}
            action={primaryAction}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.name")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.subject")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.level")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.pricePerSession")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.status")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.groups.updated")}
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
                        {group.status === "ACTIVE"
                          ? t("classes.groups.statusOptions.active")
                          : t("classes.groups.statusOptions.archived")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatDate(group.updatedAt, i18n.language)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <CrudRowActions
                        primaryAction={{
                          label: t("classes.groups.open"),
                          href: `/class-groups/${group.id}`,
                        }}
                        secondaryActions={[
                          {
                            label: t("classes.groups.edit"),
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
