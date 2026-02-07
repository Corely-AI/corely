import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { CheckCircle2, XCircle, CalendarDays } from "lucide-react";
import { Button, Card, CardContent } from "@corely/ui";
import { toast } from "sonner";
import { ApiError, normalizeError } from "@corely/api-client";
import { classesApi } from "@/lib/classes-api";
import { CrudListPageLayout, CrudRowActions, ConfirmDeleteDialog } from "@/shared/crud";
import {
  ActiveFilterChips,
  FilterPanel,
  ListToolbar,
  type FilterFieldDef,
  useListUrlState,
} from "@/shared/list-kit";
import { formatDateTime } from "@/shared/lib/formatters";
import { classGroupKeys, classSessionKeys } from "../queries";

export default function SessionsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmStatus, setConfirmStatus] = useState<{
    id: string;
    status: "DONE" | "CANCELLED";
  } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [state, setUrlState] = useListUrlState(
    { pageSize: 10, sort: "startsAt:desc" },
    { storageKey: "class-sessions-list-v1" }
  );

  const { data: groupsData } = useQuery({
    queryKey: classGroupKeys.list({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.listClassGroups({ page: 1, pageSize: 100 }),
  });

  const groupOptions = useMemo(
    () => (groupsData?.items ?? []).map((group) => ({ value: group.id, label: group.name })),
    [groupsData]
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { label: t("classes.sessions.statusOptions.planned"), value: "PLANNED" },
      { label: t("classes.sessions.statusOptions.done"), value: "DONE" },
      { label: t("classes.sessions.statusOptions.cancelled"), value: "CANCELLED" },
    ],
    [t]
  );

  const filterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "classGroupId",
        label: t("classes.sessions.filterClassGroup"),
        type: "select",
        options: groupOptions,
      },
      {
        key: "status",
        label: t("classes.sessions.filterStatus"),
        type: "select",
        options: STATUS_OPTIONS,
      },
      { key: "dateFrom", label: t("classes.sessions.filterDateFrom"), type: "date" },
      { key: "dateTo", label: t("classes.sessions.filterDateTo"), type: "date" },
    ],
    [groupOptions, STATUS_OPTIONS, t]
  );

  const filters = useMemo(() => {
    const classGroup = state.filters?.find(
      (f) => f.field === "classGroupId" && f.operator === "eq"
    );
    const status = state.filters?.find((f) => f.field === "status" && f.operator === "eq");
    const dateFrom = state.filters?.find((f) => f.field === "dateFrom" && f.operator === "gte");
    const dateTo = state.filters?.find((f) => f.field === "dateTo" && f.operator === "lte");
    return {
      classGroupId: classGroup ? String(classGroup.value) : undefined,
      status: status ? String(status.value) : undefined,
      dateFrom: dateFrom ? String(dateFrom.value) : undefined,
      dateTo: dateTo ? String(dateTo.value) : undefined,
    };
  }, [state.filters]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: classSessionKeys.list(state),
    queryFn: () =>
      classesApi.listSessions({
        q: state.q,
        page: state.page,
        pageSize: state.pageSize,
        sort: state.sort,
        classGroupId: filters.classGroupId,
        status: filters.status as any,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        filters: state.filters,
      }),
    placeholderData: keepPreviousData,
  });

  const sessions = data?.items ?? [];

  const updateStatus = useMutation({
    mutationFn: async (payload: { id: string; status: "DONE" | "CANCELLED" }) =>
      classesApi.updateSession(payload.id, { status: payload.status }),
    onSuccess: async () => {
      toast.success(t("classes.sessions.updated"));
      setConfirmStatus(null);
      await queryClient.invalidateQueries({ queryKey: classSessionKeys.list(undefined) });
    },
    onError: (error) => {
      const apiError = error instanceof ApiError ? error : normalizeError(error);
      if (apiError.code === "Classes:MonthLocked") {
        toast.error(t("classes.sessions.monthLocked"), {
          description: apiError.detail || t("classes.sessions.monthLockedDescription"),
        });
        console.warn("Classes:MonthLocked", {
          code: apiError.code,
          status: apiError.status,
        });
        return;
      }

      toast.error(apiError.detail || t("classes.sessions.updateFailed"));
      console.warn("Sessions update failed", { code: apiError.code, status: apiError.status });
    },
  });

  return (
    <>
      <CrudListPageLayout
        title={t("classes.sessions.title")}
        subtitle={t("classes.sessions.subtitle")}
        primaryAction={
          <Button variant="accent" onClick={() => navigate("/sessions")}>
            <CalendarDays className="h-4 w-4" />
            {t("classes.sessions.new")}
          </Button>
        }
        toolbar={
          <ListToolbar
            search={state.q}
            onSearchChange={(value) => setUrlState({ q: value, page: 1 })}
            sort={state.sort}
            onSortChange={(value) => setUrlState({ sort: value })}
            sortOptions={[
              { label: t("classes.sessions.sortOptions.newest"), value: "startsAt:desc" },
              { label: t("classes.sessions.sortOptions.oldest"), value: "startsAt:asc" },
            ]}
            onFilterClick={() => setIsFilterOpen(true)}
            filterCount={state.filters?.length}
          >
            {isError ? (
              <div className="text-sm text-destructive">
                {(error as Error)?.message || t("classes.sessions.loadFailed")}
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
          <div className="p-8 text-center text-muted-foreground">
            {t("classes.sessions.loading")}
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{t("classes.sessions.empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.sessions.starts")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.sessions.topic")}
                  </th>
                  <th className="text-left text-sm font-medium text-muted-foreground px-4 py-3">
                    {t("classes.sessions.status")}
                  </th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const isBillingLocked =
                    session.billingMonthStatus === "INVOICES_CREATED" ||
                    session.billingMonthStatus === "LOCKED";
                  const lockTooltip = isBillingLocked
                    ? t("classes.sessions.billingLockedTooltip")
                    : undefined;

                  return (
                    <tr
                      key={session.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {formatDateTime(session.startsAt, i18n.language)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {session.topic || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {t(`classes.sessions.statusOptions.${session.status.toLowerCase()}`)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <CrudRowActions
                          primaryAction={{
                            label: t("classes.sessions.open"),
                            href: `/sessions/${session.id}`,
                          }}
                          secondaryActions={[
                            {
                              label: t("classes.sessions.markDone"),
                              icon: <CheckCircle2 className="h-4 w-4" />,
                              disabled: isBillingLocked,
                              tooltip: lockTooltip,
                              onClick: () => setConfirmStatus({ id: session.id, status: "DONE" }),
                            },
                            {
                              label: t("classes.sessions.cancel"),
                              destructive: true,
                              icon: <XCircle className="h-4 w-4" />,
                              disabled: isBillingLocked,
                              tooltip: lockTooltip,
                              onClick: () =>
                                setConfirmStatus({ id: session.id, status: "CANCELLED" }),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
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

      <ConfirmDeleteDialog
        open={Boolean(confirmStatus)}
        trigger={null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmStatus(null);
          }
        }}
        onConfirm={() => {
          if (confirmStatus) {
            updateStatus.mutate(confirmStatus);
          }
        }}
        title={t("classes.sessions.confirmTitle")}
        description={t("classes.sessions.confirmDescription", {
          status: t(
            `classes.sessions.statusOptions.${(confirmStatus?.status ?? "").toLowerCase()}`
          ),
        })}
        confirmLabel={t("common.confirm")}
      />
    </>
  );
}
